/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import moment from 'moment';
import type { HttpStart, NotificationsStart } from '@kbn/core/public';
import {
  EuiBadge,
  EuiCallOut,
  EuiColorPicker,
  EuiComboBox,
  EuiDatePicker,
  EuiFieldNumber,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiSelect,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
  EuiToolTip,
  EuiButtonIcon,
  EuiButtonEmpty,
} from '@elastic/eui';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { findFirstFiberWithDebugSource } from '../../../lib/fiber/find_first_fiber_with_debug_source';
import { getEditability } from '../../../lib/editability';
import { forceRerenderWithProps } from '../../../lib/force_rerender';
import type { ForceRerenderReason } from '../../../lib/force_rerender';
import { commitProp } from '../../../lib/commit_prop';
import { fetchDocgen } from '../../../lib/docgen';
import type { DocgenProp, DocgenProps } from '../../../lib/docgen';

interface FileData {
  fileName: string;
  lineNumber: number;
  columnNumber: number;
  mtime: number;
  explicitProps: string[];
}

interface PropsSectionProps {
  target: HTMLElement;
  fileData: FileData;
  httpService: HttpStart;
  notifications: NotificationsStart;
  /**
   * Invoked after a successful live-preview override (a forceRerenderWithProps
   * that actually changed the target component) or a successful commit, so
   * the flyout can refresh ComponentPreview to reflect the new rendered DOM.
   */
  onLivePreviewUpdate?: () => void;
}

type PropValue = string | number | boolean | unknown;

interface PropRowState {
  displayValue: PropValue;
  originalValue: PropValue;
  errorMsg: string | null;
  // True for props the user added via the "Add prop" affordance and which
  // haven't been committed to source yet. Such rows always show the Commit
  // button (since the prop doesn't exist on disk yet, regardless of whether
  // displayValue equals originalValue) and replace the Reset button with a
  // Remove button that just deletes the row from local state.
  isNew?: boolean;
}

const isEditable = (v: unknown): v is string | number | boolean =>
  typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean';

/**
 * Normalize a raw TypeScript literal as returned by react-docgen-typescript.
 * The library returns each union member as the textual source-form literal:
 *   string literal     'small'   →   '"small"'  (with quotes)
 *   number literal     1         →   '1'        (no quotes)
 *   boolean literal    true      →   'true'
 * Returns the parsed primitive, or `null` if the raw form can't be normalized
 * (e.g. `undefined`, enum references, complex types). Null entries are filtered
 * out before building select options.
 */
const normalizeLiteralValue = (raw: string): string | number | boolean | null => {
  const trimmed = raw.trim();
  if (trimmed.length >= 2) {
    const first = trimmed[0];
    const last = trimmed[trimmed.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return trimmed.slice(1, -1);
    }
  }
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  return null;
};

// Prop-name heuristics for specialized controls. We intentionally only check
// the prop name (not the value) because the value alone is ambiguous —
// `'primary'` could be an EUI color token or a string in any other context.
// These run *after* the literal-union check so a typed enum still wins.
const isIconProp = (propName: string) => /^icon(type)?$/i.test(propName);
const isColorProp = (propName: string) => /(^|[a-z])color$/i.test(propName);
const isDateProp = (propName: string) => /date$/i.test(propName);

// Hardcoded EUI design-token sets used when docgen can't recover a literal
// union for well-known prop names (which is common for EUI components because
// their `type` declarations frequently widen to `string` through indirection).
// We offer the cross-component superset — a value valid in one component may
// not be valid in another, but EUI will surface a runtime warning if so, which
// is acceptable for a PoC and far better than no dropdown at all.
const EUI_PADDING_TOKENS = ['none', 'xs', 's', 'm', 'l', 'xl'] as const;
const EUI_COLOR_TOKENS = [
  'primary',
  'accent',
  'accentSecondary',
  'success',
  'warning',
  'danger',
  'text',
  'subdued',
  'default',
  'ghost',
  'hollow',
  'inherit',
] as const;

const isPaddingTokenProp = (propName: string) => /^(padding|gutter)(size)?$/i.test(propName);

// Detect a free-form color string (hex / rgb / rgba / hsl / hsla). When a
// color prop's current value is one of these, we render the color picker
// instead of the token dropdown — semantic tokens like 'primary' fail this
// check and fall through to the dropdown.
const isFreeformColorString = (value: string) =>
  /^(#[0-9a-f]{3,8}|rgba?\(|hsla?\()/i.test(value.trim());

/**
 * Pick a sensible starting value when the user adds a prop they haven't set
 * yet. Order of preference:
 *  1. The docgen-declared `defaultValue` if it parses as a primitive.
 *  2. The first member of a literal union (so e.g. `'none' | 's' | ...`
 *     starts at `'none'`).
 *  3. A type-derived blank: booleans → false, numbers → 0, strings → ''.
 * Returns `''` when nothing better is available so the input is at least
 * rendered as an editable string control.
 */
const inferDefaultValueForProp = (docgenProp: DocgenProp | undefined): PropValue => {
  if (docgenProp?.defaultValue) {
    const normalized = normalizeLiteralValue(docgenProp.defaultValue.value);
    if (normalized !== null) return normalized;
  }
  const unionMembers = docgenProp?.type?.value;
  if (unionMembers && unionMembers.length > 0) {
    const first = normalizeLiteralValue(unionMembers[0].value);
    if (first !== null) return first;
  }
  const typeName = docgenProp?.type?.name;
  if (typeName === 'boolean') return false;
  if (typeName === 'number') return 0;
  return '';
};

/**
 * Try to coerce a prop value into a moment for the date picker. Accepts
 * moment, Date, ISO string, or any string moment can parse. Returns `null` for
 * things that don't look date-shaped so the caller can fall back to a plain
 * text field instead of rendering an "Invalid date" picker.
 */
const toMomentOrNull = (value: unknown): moment.Moment | null => {
  if (moment.isMoment(value)) return value;
  if (value instanceof Date) {
    const m = moment(value);
    return m.isValid() ? m : null;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const m = moment(value);
    return m.isValid() ? m : null;
  }
  return null;
};

const DEVTOOLS_INSTALL_URL = 'https://react.dev/learn/react-developer-tools';

// User-facing message per failure reason. Keep these specific enough that the
// user can act on them or report them back without us needing to dig.
const REASON_MESSAGES: Record<ForceRerenderReason, string> = {
  devtools_hook_missing: 'React DevTools extension required',
  no_renderer_interfaces: 'No React renderers registered with DevTools yet',
  fiber_not_found: 'Could not locate the component fiber for this element',
  getfiberidfornative_missing:
    'DevTools renderer missing getFiberIDForNative — incompatible version',
  overrideprops_missing: 'DevTools renderer missing overrideProps — incompatible version',
  id_lookup_failed: 'DevTools could not resolve a fiber ID for this element',
  component_id_not_resolved:
    "DevTools returned a host-fiber ID and the component fiber couldn't be located in its owner chain",
  override_threw: 'overrideProps threw an error',
};

export const PropsSection = ({
  target,
  fileData,
  httpService,
  notifications,
  onLivePreviewUpdate,
}: PropsSectionProps) => {
  const { fileName, lineNumber, columnNumber, mtime: initialMtime, explicitProps } = fileData;

  // Re-resolve fiber fresh on each render to avoid stale refs.
  const fiber = useMemo(() => findFirstFiberWithDebugSource(target), [target]);
  const editability = useMemo(
    () =>
      fiber
        ? getEditability(fiber)
        : { editable: false as const, reason: 'no_debug_source' as const },
    [fiber]
  );

  const devToolsHookPresent = useMemo(
    () =>
      typeof (window as unknown as Record<string, unknown>).__REACT_DEVTOOLS_GLOBAL_HOOK__ !==
      'undefined',
    []
  );

  // Snapshot of prop values when the flyout opened — used for reset.
  const originalProps = useRef<Record<string, unknown>>(
    (fiber?.memoizedProps as Record<string, unknown>) ?? {}
  );

  // Per-prop controlled state: { [propName]: { displayValue, originalValue, errorMsg } }
  const [propStates, setPropStates] = useState<Record<string, PropRowState>>(() => {
    const initial: Record<string, PropRowState> = {};
    const props = (fiber?.memoizedProps as Record<string, unknown>) ?? {};
    for (const [key, val] of Object.entries(props)) {
      initial[key] = { displayValue: val, originalValue: val, errorMsg: null };
    }
    return initial;
  });

  const [currentMtime, setCurrentMtime] = useState(initialMtime);
  const [docgenProps, setDocgenProps] = useState<DocgenProps | null>(null);

  // Names of props the user has added via the "Add prop" UI, in the order
  // they were added. Merged with `explicitProps` to form the primary list so
  // added props render alongside the source-derived ones.
  const [addedPropsOrder, setAddedPropsOrder] = useState<string[]>([]);
  // When true, render the inline add-prop form below the primary list.
  const [isAddingProp, setIsAddingProp] = useState(false);

  // Fetch docgen on mount.
  useEffect(() => {
    if (!fiber) return;
    const componentName =
      typeof fiber.type === 'function'
        ? (fiber.type as { displayName?: string; name?: string }).displayName ||
          (fiber.type as { name?: string }).name ||
          ''
        : '';
    if (!componentName) return;

    fetchDocgen({ httpService, component: componentName, from: fileName }).then((result) => {
      if (result.ok) setDocgenProps(result.props);
    });
  }, [fiber, fileName, httpService]);

  const handleChange = useCallback(
    (propName: string, newValue: PropValue) => {
      // Update the staged display value first so the input is always responsive.
      setPropStates((prev) => ({
        ...prev,
        [propName]: { ...prev[propName], displayValue: newValue, errorMsg: null },
      }));

      if (!isEditable(newValue)) return;

      const result = forceRerenderWithProps(target, propName, newValue);
      if (!result.ok) {
        const base = REASON_MESSAGES[result.reason] ?? `Preview failed: ${result.reason}`;
        setPropStates((prev) => ({
          ...prev,
          [propName]: {
            ...prev[propName],
            errorMsg: result.detail ? `${base} (${result.detail})` : base,
          },
        }));
      } else {
        onLivePreviewUpdate?.();
      }
    },
    [target, onLivePreviewUpdate]
  );

  const handleReset = useCallback(
    (propName: string) => {
      const original = originalProps.current[propName];
      handleChange(propName, original);
    },
    [handleChange]
  );

  const handleCommit = useCallback(
    async (propName: string) => {
      const state = propStates[propName];
      if (!state || !isEditable(state.displayValue)) return;

      const result = await commitProp({
        httpService,
        file: fileName,
        lineNumber,
        columnNumber,
        propName,
        newValue: state.displayValue,
        originalMtime: currentMtime,
      });

      if (result.ok) {
        setCurrentMtime(result.mtime);
        originalProps.current = { ...originalProps.current, [propName]: state.displayValue };
        setPropStates((prev) => ({
          ...prev,
          [propName]: {
            ...prev[propName],
            originalValue: state.displayValue,
            // After a successful commit the prop is in source, so it's no
            // longer "new" — return to the normal Commit-on-change behavior.
            isNew: false,
          },
        }));
        notifications.toasts.addSuccess(`Committed ${propName}`);
        // Bump preview now (the live-preview override already changed the
        // DOM) and again after HMR has had time to reload the module, so
        // the post-commit screenshot reflects what's actually on disk.
        onLivePreviewUpdate?.();
        const hmrBump = setTimeout(() => onLivePreviewUpdate?.(), 1000);
        // Defensive: if commit_prop runs through a fast HMR cycle, an extra
        // bump 1s later is harmless (debounced in ComponentPreview).
        void hmrBump;
      } else if (result.error === 'file_changed_on_disk') {
        notifications.toasts.addWarning({
          title: 'File changed on disk',
          text: 'Another process modified this file. Reload the inspector to sync.',
        });
      } else {
        notifications.toasts.addDanger(`Commit failed: ${result.error}`);
      }
    },
    [
      propStates,
      httpService,
      fileName,
      lineNumber,
      columnNumber,
      currentMtime,
      notifications,
      onLivePreviewUpdate,
    ]
  );

  const handleAddProp = useCallback(
    (name: string) => {
      const trimmed = name.trim();
      if (!trimmed || trimmed in propStates) return;

      const defaultValue = inferDefaultValueForProp(docgenProps?.[trimmed]);

      setPropStates((prev) => ({
        ...prev,
        [trimmed]: {
          displayValue: defaultValue,
          originalValue: defaultValue,
          errorMsg: null,
          isNew: true,
        },
      }));
      setAddedPropsOrder((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed]));
      setIsAddingProp(false);

      // Push the default through live preview immediately so the user sees
      // *something* happen on add. If the default isn't editable (rare) we
      // skip — the row is still useful as an editable handle.
      if (isEditable(defaultValue)) {
        const result = forceRerenderWithProps(target, trimmed, defaultValue);
        if (!result.ok) {
          const base = REASON_MESSAGES[result.reason] ?? `Preview failed: ${result.reason}`;
          setPropStates((prev) => ({
            ...prev,
            [trimmed]: {
              ...prev[trimmed],
              errorMsg: result.detail ? `${base} (${result.detail})` : base,
            },
          }));
        } else {
          onLivePreviewUpdate?.();
        }
      }
    },
    [docgenProps, propStates, target, onLivePreviewUpdate]
  );

  const handleRemoveProp = useCallback((name: string) => {
    // Removes the row from local state only. We deliberately do NOT try to
    // "un-set" the DevTools override here — there's no clean semantic for
    // reverting a forcibly-injected prop back to undefined, and chasing it
    // would be flaky. The live value persists until something else triggers
    // a re-render; documented in POC_NOTES.md.
    setPropStates((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
    setAddedPropsOrder((prev) => prev.filter((n) => n !== name));
  }, []);

  // --- Render helpers ---

  const renderControl = (propName: string, value: PropValue) => {
    const docgenProp = docgenProps?.[propName];
    const typeStr = docgenProp?.type?.name ?? '';
    const rawUnion = docgenProp?.type?.value;

    // Literal union (string or number) → EuiSelect. We normalize each member,
    // drop anything that can't be parsed as a primitive (e.g. `undefined`),
    // and infer a single uniform type. Mixed-type unions and boolean-only
    // unions fall through to the type-based controls below.
    const normalizedUnion = rawUnion
      ?.map((v) => normalizeLiteralValue(v.value))
      .filter((v): v is string | number | boolean => v !== null);

    if (normalizedUnion && normalizedUnion.length > 1) {
      const allStrings = normalizedUnion.every((v) => typeof v === 'string');
      const allNumbers = normalizedUnion.every((v) => typeof v === 'number');

      if (allStrings || allNumbers) {
        // EuiSelect option values are always strings — keep a parallel map so
        // we can recover the typed primitive on change.
        const options = normalizedUnion.map((v) => ({ value: String(v), text: String(v) }));
        const currentAsOptionValue =
          typeof value === 'string' || typeof value === 'number' ? String(value) : '';
        return (
          <EuiSelect
            compressed
            aria-label={propName}
            options={options}
            value={currentAsOptionValue}
            onChange={(e) => {
              const picked = normalizedUnion.find((v) => String(v) === e.target.value);
              handleChange(propName, picked ?? e.target.value);
            }}
          />
        );
      }
    }

    // EUI padding / gutter token fallback. Always a small fixed set.
    if (isPaddingTokenProp(propName) && typeof value === 'string') {
      const options = EUI_PADDING_TOKENS.map((v) => ({ value: v, text: v }));
      return (
        <EuiSelect
          compressed
          aria-label={propName}
          options={options}
          value={value}
          onChange={(e) => handleChange(propName, e.target.value)}
        />
      );
    }

    // EUI semantic-color token fallback. Only use the dropdown when the
    // current value is *not* a free-form color (#hex / rgb / hsl) — those
    // fall through to the color picker below.
    if (isColorProp(propName) && typeof value === 'string' && !isFreeformColorString(value)) {
      const options = EUI_COLOR_TOKENS.map((v) => ({ value: v, text: v }));
      return (
        <EuiSelect
          compressed
          aria-label={propName}
          options={options}
          value={value}
          onChange={(e) => handleChange(propName, e.target.value)}
        />
      );
    }

    // Icon prop → text field with live EuiIcon preview prepended. We don't
    // ship a full icon picker (EUI doesn't expose the icon list at runtime),
    // but the live preview lets the user verify the name as they type.
    if (isIconProp(propName) && typeof value === 'string') {
      return (
        <EuiFieldText
          compressed
          aria-label={propName}
          prepend={value ? <EuiIcon type={value} aria-hidden="true" /> : undefined}
          value={value}
          onChange={(e) => handleChange(propName, e.target.value)}
          placeholder={typeStr || 'icon name'}
        />
      );
    }

    // Color prop with a free-form string value → EuiColorPicker.
    // (Semantic-token colors like `color="primary"` would have hit the
    // literal-union branch above and rendered as a dropdown.)
    if (isColorProp(propName) && typeof value === 'string') {
      return (
        <EuiColorPicker
          compressed
          color={value}
          onChange={(color) => handleChange(propName, color)}
          isClearable
        />
      );
    }

    // Date prop → EuiDatePicker. Only kicks in when the current value is
    // actually date-shaped; an unparseable string falls through to the plain
    // text field so we don't trap the user in a picker showing "Invalid date".
    if (isDateProp(propName)) {
      const asMoment = toMomentOrNull(value);
      if (asMoment) {
        const originalIsString = typeof value === 'string';
        return (
          <EuiDatePicker
            selected={asMoment}
            onChange={(d) => {
              if (!d) return handleChange(propName, originalIsString ? '' : null);
              // Preserve the original value type. If the source had a string,
              // commit it back as ISO (commit_prop only handles primitives);
              // if it was a Date, keep the Date so live preview matches.
              handleChange(propName, originalIsString ? d.toISOString() : d.toDate());
            }}
          />
        );
      }
    }

    if (typeof value === 'boolean') {
      return (
        <EuiSwitch
          compressed
          label=""
          checked={value}
          onChange={(e) => handleChange(propName, e.target.checked)}
        />
      );
    }

    if (typeof value === 'number') {
      return (
        <EuiFieldNumber
          compressed
          value={value}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            handleChange(propName, Number(e.target.value))
          }
        />
      );
    }

    if (typeof value === 'string') {
      return (
        <EuiFieldText
          compressed
          value={value}
          onChange={(e) => handleChange(propName, e.target.value)}
          placeholder={typeStr || undefined}
        />
      );
    }

    return (
      <EuiBadge color="hollow" title={String(value)}>
        complex — not editable
      </EuiBadge>
    );
  };

  const renderRow = (propName: string) => {
    const state = propStates[propName];
    if (!state) return null;
    const { displayValue, originalValue, errorMsg, isNew } = state;
    const hasChanged = displayValue !== originalValue;
    const showCommit = (hasChanged || isNew) && isEditable(displayValue);
    const docgenProp = docgenProps?.[propName];

    return (
      <div key={propName} style={{ marginBottom: 8 }}>
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false} style={{ minWidth: 120 }}>
            <EuiToolTip content={docgenProp?.description || propName}>
              {/* tabIndex makes the tooltip anchor keyboard-focusable per EUI requirement */}
              <EuiText size="xs" tabIndex={0}>
                <code>{propName}</code>
              </EuiText>
            </EuiToolTip>
          </EuiFlexItem>
          <EuiFlexItem>{renderControl(propName, displayValue)}</EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="xs" responsive={false}>
              {isNew ? (
                <EuiFlexItem grow={false}>
                  <EuiButtonIcon
                    iconType="cross"
                    size="xs"
                    color="danger"
                    aria-label={`Remove ${propName}`}
                    title="Remove this added prop"
                    onClick={() => handleRemoveProp(propName)}
                  />
                </EuiFlexItem>
              ) : (
                hasChanged && (
                  <EuiFlexItem grow={false}>
                    <EuiButtonIcon
                      iconType="refresh"
                      size="xs"
                      aria-label={`Reset ${propName}`}
                      title="Reset to original value"
                      onClick={() => handleReset(propName)}
                    />
                  </EuiFlexItem>
                )
              )}
              {showCommit && (
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    size="xs"
                    onClick={() => handleCommit(propName)}
                    aria-label={`Commit ${propName}`}
                  >
                    Commit
                  </EuiButtonEmpty>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
        {docgenProp?.type?.name && (
          <EuiText size="xs" color="subdued" style={{ marginLeft: 120, marginTop: 2 }}>
            {docgenProp.type.name}
            {docgenProp.defaultValue ? ` — default: ${docgenProp.defaultValue.value}` : ''}
          </EuiText>
        )}
        {errorMsg && (
          <EuiText size="xs" color="danger" style={{ marginLeft: 120, marginTop: 2 }}>
            {errorMsg}
          </EuiText>
        )}
      </div>
    );
  };

  // --- Guard renders ---

  if (!devToolsHookPresent) {
    return (
      <EuiCallOut
        announceOnMount={false}
        title="React DevTools extension required"
        color="warning"
        iconType="warning"
      >
        <p>
          Live prop preview requires the React DevTools browser extension.{' '}
          <EuiLink href={DEVTOOLS_INSTALL_URL} target="_blank">
            Install React DevTools
          </EuiLink>
          , then reload the page and reopen the inspector. The extension panel does not need to be
          open — just installed.
        </p>
      </EuiCallOut>
    );
  }

  if (!editability.editable) {
    const messages: Record<string, string> = {
      in_node_modules: 'Component is from node_modules — not editable.',
      host_primitive: 'Host DOM element — no React props to edit.',
      no_debug_source: 'No source location available for this component.',
      fragment: 'React Fragment — no props to edit.',
    };
    return (
      <EuiCallOut announceOnMount={false} title="Props not editable" iconType="iInCircle" size="s">
        <p>{messages[editability.reason] ?? 'This component cannot be edited.'}</p>
      </EuiCallOut>
    );
  }

  // --- Primary prop list ---

  // Primary list = source-derived "explicit" props, plus user-added props in
  // insertion order. Filtering by `in propStates` is defensive (a row could
  // get removed between renders).
  const primaryPropNames = [
    ...explicitProps.filter((n) => n in propStates),
    ...addedPropsOrder.filter((n) => n in propStates),
  ];

  // Options for the add-prop combobox: docgen-known props that aren't already
  // shown. When docgen returned nothing, the list is empty but the user can
  // still type a free-form name (via `onCreateOption`).
  const addPropOptions: Array<EuiComboBoxOptionOption<string>> = docgenProps
    ? Object.values(docgenProps)
        .filter((p) => !(p.name in propStates))
        .map((p) => ({ label: p.name, value: p.name }))
    : [];

  return (
    <>
      <EuiTitle size="xxs">
        <h4>Explicitly set props</h4>
      </EuiTitle>
      <EuiSpacer size="xs" />
      {primaryPropNames.length === 0 ? (
        <EuiText size="xs" color="subdued">
          No explicitly set props detected.
        </EuiText>
      ) : (
        primaryPropNames.map((name) => renderRow(name))
      )}

      {isAddingProp ? (
        <div style={{ marginBottom: 8 }}>
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem>
              <EuiComboBox<string>
                compressed
                aria-label="Prop name"
                placeholder="Prop name…"
                singleSelection={{ asPlainText: true }}
                options={addPropOptions}
                selectedOptions={[]}
                onChange={(selected) => {
                  if (selected.length > 0) handleAddProp(selected[0].label);
                }}
                onCreateOption={(input) => handleAddProp(input)}
                autoFocus
                isClearable={false}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                iconType="cross"
                size="xs"
                aria-label="Cancel adding prop"
                title="Cancel"
                onClick={() => setIsAddingProp(false)}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
      ) : (
        <EuiButtonEmpty
          size="xs"
          iconType="plusInCircle"
          onClick={() => setIsAddingProp(true)}
          aria-label="Add prop"
        >
          Add prop
        </EuiButtonEmpty>
      )}
    </>
  );
};
