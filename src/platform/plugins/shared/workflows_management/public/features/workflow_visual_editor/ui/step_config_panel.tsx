/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiAccordion,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiComboBox,
  EuiConfirmModal,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiEmptyPrompt,
  EuiFieldNumber,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiHorizontalRule,
  EuiIcon,
  EuiIconTip,
  EuiPopover,
  EuiSwitch,
  EuiTab,
  EuiTabs,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiFontSize,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { isEqual } from 'lodash';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { isMap, parseDocument, stringify as stringifyYaml } from 'yaml';
import { CodeEditor } from '@kbn/code-editor';
import { i18n } from '@kbn/i18n';
import { ESQL_LANG_ID, XJSON_LANG_ID, YAML_LANG_ID } from '@kbn/monaco';
import type { monaco } from '@kbn/monaco';
import type { ConnectorContractUnion, WorkflowYaml } from '@kbn/workflows';
import { getBuiltInStepDefinition } from '@kbn/workflows';
import {
  ensureWorkflowGraphEuiIcons,
  resolveNodeChipStyle,
  stepSupportsErrorHandling,
  workflowsEditorChromeOverrides,
} from '@kbn/workflows-ui';
import { isReferenceValue } from '@kbn/workflows-yaml';
import type { DataReferenceRunControls } from './data_reference_catalog_tree';
import { FieldEditorSubFlyout } from './field_editor_sub_flyout';
import { FlyoutMonacoFrame, getFlyoutMonacoEditorOptions } from './flyout_monaco_frame';
import { ensureJsonLiquidLanguage, JSON_LIQUID_LANG_ID } from './json_liquid_language';
import { KeyValueField } from './key_value_field';
import { ListField } from './list_field';
import { ReferenceCapableField } from './reference_capable_field';
import { ContainerInSentenceCallout } from './reference_container_callout';
import { ReferenceTextInput } from './reference_text_input';
import { ReferenceValueBox } from './reference_value_box';
import { StepErrorHandlingSection } from './step_error_handling_section';
import { SwitchCasesField } from './switch_cases_field';
import { DESCRIPTION_MAX_LINES, useDescriptionOverflow } from './use_description_overflow';
import {
  getReferenceChipEditorCss,
  useReferenceDecorations,
  useReferenceIconMasks,
} from './use_reference_decorations';
import type { ValueSource } from './value_source_toggle';
import { ValueSourceToggle } from './value_source_toggle';
import { VariantField } from './variant_field';
import { StepIcon } from '../../../shared/ui/step_icons/step_icon';
import { resolveCatalogDisplayName } from '../../../shared/utils/catalog_display_name';
import type { StepScopeSchemas } from '../lib/build_data_reference_catalog';
import {
  buildDataReferenceCatalog,
  formatDataReferenceToken,
  formatValueReferenceToken,
} from '../lib/build_data_reference_catalog';
import { fromTags, isTagValue, toTags } from '../lib/list_value';
import { findReferenceTokens, insertTokenAsJsonText } from '../lib/reference_tokens';
import type { ReferenceForm } from '../lib/reference_value';
import {
  isContainerReference,
  isSingleValueReference,
  lookupReferenceTypeLabel,
  parseWholeReference,
} from '../lib/reference_value';
import {
  fieldLabelDivergesFromKey,
  getStepFormSchema,
  isEmptyFieldValue,
  isFieldValueRepresentable,
  type StepFormField,
  validateStepField,
} from '../lib/step_form_schema';

ensureWorkflowGraphEuiIcons();

/**
 * Where the step the panel is editing came from — every edit live-applies to
 * the YAML regardless of mode; this only selects the footer button and its
 * behavior ('insert': "Remove node" undoes the insert; 'edit': "Reset node"
 * restores the pre-flyout fragment).
 */
export type StepConfigPanelMode = 'insert' | 'edit';

export interface StepConfigPanelProps {
  readonly mode: StepConfigPanelMode;
  readonly stepType: string;
  /**
   * Catalog display name from the Actions menu (e.g. "HTTP Request"). Used for
   * the subtitle (and as the title fallback when the step has no name yet).
   */
  readonly actionLabel?: string;
  /** Step YAML fragment (a mapping) the panel starts from. */
  readonly initialFragment: string;
  readonly connectors: readonly ConnectorContractUnion[];
  /** Full workflow definition — powers data-reference sources (triggers/steps/consts). */
  readonly workflowDefinition?: WorkflowYaml;
  /** Scope the named step runs in (its loop, variables), for the picker's "Step context" group. */
  readonly resolveStepScope?: (stepName: string) => StepScopeSchemas;
  /**
   * Closes the flyout, keeping the node and any edits already applied to the
   * YAML — ✕, Escape and the field sub-flyout's close-stack all route here.
   */
  readonly onClose: () => void;
  /**
   * Footer button action: restores the step to its pre-flyout state (mode
   * 'edit') or removes the node entirely, undoing the insert (mode 'insert').
   */
  readonly onRevert: () => void;
  /**
   * True when this panel configures an `on-failure.fallback` step — hides the
   * Error handling section (mirrors canvas error-port eligibility).
   */
  readonly isFallbackStep?: boolean;
  /**
   * Notifies the canvas shell when the expanded field editor is open so it can
   * widen to fill available canvas width.
   */
  readonly onExpandedChange?: (expanded: boolean) => void;
  /**
   * Fires on every draft change with the current fragment string — the
   * stateful shell live-applies each valid edit straight to the YAML.
   */
  readonly onFragmentChange?: (fragment: string) => void;
  /**
   * Mount hook for the YAML tab's `CodeEditor` — the stateful shell uses this
   * to wire full-workflow validation/autocomplete onto the step fragment
   * (see `useStepFragmentYamlSupport`).
   */
  readonly onYamlEditorMount?: (editor: monaco.editor.IStandaloneCodeEditor) => void;
  /** Run controls and data for the expanded field editor's reference tree. */
  readonly runControls?: DataReferenceRunControls;
}

const CODE_EDITOR_HEIGHT = 160;

/** Builder form vs full-step YAML — same axis as the canvas bottom-bar toggle. */
type ParametersMode = 'form' | 'yaml';

/** Catalog display name — same label the Actions menu shows. */
const resolveCatalogLabel = (
  stepType: string,
  connectors: readonly ConnectorContractUnion[],
  actionLabel?: string
): string => {
  const builtIn = getBuiltInStepDefinition(stepType);
  const connector = connectors.find((c) => c.type === stepType) as
    | (ConnectorContractUnion & {
        summary?: string | null;
        displayName?: string;
        description?: string | null;
      })
    | undefined;
  return resolveCatalogDisplayName({
    type: stepType,
    actionLabel,
    builtInLabel: builtIn?.label,
    summary: connector?.summary,
    displayName: connector?.displayName,
    description: connector?.description,
  });
};

/** Flatten newlines / runs of whitespace for single-line Inputs display only. */
const collapseWhitespaceForDisplay = (text: string): string => text.replace(/\s+/g, ' ');

/** Monaco language for a code field. There is no KQL Monaco mode, so conditions use plaintext. */
const monacoLanguageFor = (field: StepFormField): string => {
  switch (field.language) {
    case 'json':
      return XJSON_LANG_ID;
    case 'esql':
      return ESQL_LANG_ID;
    case 'json-liquid':
      ensureJsonLiquidLanguage();
      return JSON_LIQUID_LANG_ID;
    case 'kuery':
    case 'plaintext':
    default:
      return 'plaintext';
  }
};

const readFragmentValue = (fragment: string, path: readonly string[]): unknown => {
  const doc = parseDocument(fragment);
  if (!isMap(doc.contents)) return undefined;
  return doc.getIn(path as string[], false);
};

/**
 * Writes one form-owned key back into the fragment. Only that key changes —
 * comments, unknown keys and Liquid expressions elsewhere are untouched.
 */
const writeFragmentValue = (
  fragment: string,
  field: StepFormField,
  value: unknown,
  indent: number
): string => {
  const doc = parseDocument(fragment);
  if (!isMap(doc.contents)) return fragment;
  // An empty string is the expression-mode sentinel for boolean/number fields —
  // don't delete it; keep the key so the UI stays in expression mode. KQL text has no such mode.
  if (isEmptyFieldValue(value) && (value !== '' || field.language === 'kuery') && !field.required) {
    // Nothing to delete when the key — or an ancestor mapping like `with` —
    // is absent: unlike `setIn`, `deleteIn` throws on a missing intermediate
    // node instead of treating it as a no-op.
    if (doc.hasIn(field.path as string[])) {
      doc.deleteIn(field.path as string[]);
    }
  } else {
    doc.setIn(field.path as string[], value);
  }
  return doc.toString({ indent, lineWidth: 0 });
};

const detectIndent = (yaml: string): number => {
  for (const line of yaml.split('\n')) {
    const match = line.match(/^( +)\S/);
    if (match) return match[1].length;
  }
  return 2;
};

const toJs = (value: unknown): unknown =>
  value !== null && typeof value === 'object' && 'toJSON' in (value as object)
    ? (value as { toJSON: () => unknown }).toJSON()
    : value;

/** Stable id for field rows and draft-error maps. */
const fieldId = (field: StepFormField): string => field.path.join('.');

/** For a row whose field has no sub-fields (only a `variants` field renders any). */
const renderNoSubFields = (): React.ReactElement => <></>;

/**
 * True when the panel draft differs from the applied snapshot opened with.
 * Compares parsed YAML values (not focus / "touched" state).
 */
const isDraftDirty = (draftYaml: string, appliedYaml: string): boolean => {
  if (draftYaml === appliedYaml) return false;
  try {
    const draftDoc = parseDocument(draftYaml);
    const appliedDoc = parseDocument(appliedYaml);
    if (draftDoc.errors.length > 0 || appliedDoc.errors.length > 0) {
      return draftYaml !== appliedYaml;
    }
    return !isEqual(draftDoc.toJS(), appliedDoc.toJS());
  } catch {
    return draftYaml !== appliedYaml;
  }
};

/**
 * Settings accordion open state for the lifetime of this page. Survives panel
 * remounts when switching steps; resets when the document unloads.
 */
let settingsAccordionOpenForPage = false;

/** @internal clears page-session accordion state between Jest cases. */
export function resetStepConfigPanelSessionStateForTests(): void {
  settingsAccordionOpenForPage = false;
}

export function StepConfigPanel({
  mode,
  stepType,
  actionLabel,
  initialFragment,
  connectors,
  workflowDefinition,
  resolveStepScope,
  onClose,
  onRevert,
  isFallbackStep = false,
  onExpandedChange,
  onFragmentChange,
  onYamlEditorMount,
  runControls,
}: StepConfigPanelProps) {
  const { euiTheme } = useEuiTheme();
  const [parametersMode, setParametersMode] = useState<ParametersMode>('form');
  // The fragment is the single source of truth for Form and YAML.
  const [fragment, setFragment] = useState(initialFragment);
  const [showValidation, setShowValidation] = useState(false);
  const indent = useMemo(() => detectIndent(initialFragment), [initialFragment]);
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [nameError, setNameError] = useState<string | undefined>();
  const nameEditBaselineRef = useRef('');
  const isEditingNameRef = useRef(false);
  const titleId = useGeneratedHtmlId({ prefix: 'workflowStepConfigTitle' });
  const typeSubtitleId = useGeneratedHtmlId({ prefix: 'workflowStepConfigTypeSubtitle' });
  const settingsAccordionId = useGeneratedHtmlId({ prefix: 'workflowStepConfigSettings' });
  const [settingsOpen, setSettingsOpen] = useState(settingsAccordionOpenForPage);
  /** Field currently open in the expanded editor (depth ≤ 2). */
  const [expandedField, setExpandedField] = useState<StepFormField | null>(null);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  useEffect(() => {
    onExpandedChange?.(expandedField != null);
  }, [expandedField, onExpandedChange]);

  useEffect(
    () => () => {
      onExpandedChange?.(false);
    },
    [onExpandedChange]
  );

  // Notify the canvas shell of every draft change so it can live-apply valid edits.
  useEffect(() => {
    onFragmentChange?.(fragment);
  }, [fragment, onFragmentChange]);

  const handleSettingsToggle = useCallback((isOpen: boolean) => {
    settingsAccordionOpenForPage = isOpen;
    setSettingsOpen(isOpen);
  }, []);

  const [draftErrors, setDraftErrors] = useState<ReadonlyMap<string, string>>(() => new Map());

  const handleDraftErrorChange = useCallback((id: string, error: string | undefined) => {
    setDraftErrors((prev) => {
      const had = prev.has(id);
      if (!error && !had) return prev;
      if (error && prev.get(id) === error) return prev;
      const next = new Map(prev);
      if (error) next.set(id, error);
      else next.delete(id);
      return next;
    });
  }, []);

  useEffect(() => {
    setFragment(initialFragment);
    setShowValidation(false);
    setDraftErrors(new Map());
    setIsEditingName(false);
    setNameError(undefined);
    setExpandedField(null);
    setShowDiscardConfirm(false);
  }, [initialFragment]);

  const schema = useMemo(() => getStepFormSchema(stepType, connectors), [stepType, connectors]);
  // Name is edited in the header only — never as a form body field.
  const fields = useMemo(() => schema?.fields ?? [], [schema]);

  const siblingStepNames = useMemo(() => {
    const names = new Set<string>();
    const walk = (steps: unknown) => {
      if (!Array.isArray(steps)) return;
      for (const step of steps) {
        if (!step || typeof step !== 'object') continue;
        const rec = step as Record<string, unknown>;
        if (typeof rec.name === 'string' && rec.name.trim()) names.add(rec.name.trim());
        if (Array.isArray(rec.steps)) walk(rec.steps);
        if (Array.isArray(rec.else)) walk(rec.else);
        if (Array.isArray(rec.fallback)) walk(rec.fallback);
        if (Array.isArray(rec.cases)) {
          for (const c of rec.cases) {
            if (c && typeof c === 'object' && Array.isArray((c as { steps?: unknown }).steps)) {
              walk((c as { steps: unknown[] }).steps);
            }
          }
        }
      }
    };
    walk(workflowDefinition?.steps);
    return names;
  }, [workflowDefinition]);

  const currentStepName = useMemo(() => {
    const name = toJs(readFragmentValue(fragment, ['name']));
    return typeof name === 'string' ? name : '';
  }, [fragment]);

  const referenceCatalog = useMemo(
    () =>
      buildDataReferenceCatalog({
        definition: workflowDefinition,
        currentStepName,
        connectors,
        stepScope: currentStepName ? resolveStepScope?.(currentStepName) : undefined,
      }),
    [workflowDefinition, currentStepName, connectors, resolveStepScope]
  );

  const parsed = useMemo(() => {
    const doc = parseDocument(fragment);
    const valid = doc.errors.length === 0 && isMap(doc.contents);
    const js = valid ? (doc.toJS() as Record<string, unknown>) : undefined;
    return { valid, js, error: doc.errors[0]?.message };
  }, [fragment]);

  const handleFieldChange = useCallback(
    (field: StepFormField, value: unknown) =>
      setFragment((current) => writeFragmentValue(current, field, value, indent)),
    [indent]
  );

  const expandedFieldValue = useMemo(() => {
    if (!expandedField) return '';
    const raw = toJs(readFragmentValue(fragment, expandedField.path));
    if (raw === undefined || raw === null) return '';
    if (
      expandedField.kind === 'code' &&
      (expandedField.language === 'json' || expandedField.language === 'json-liquid') &&
      typeof raw !== 'string'
    ) {
      return JSON.stringify(raw, null, 2);
    }
    return String(raw);
  }, [expandedField, fragment]);

  const handleExpandedFieldChange = useCallback(
    (next: string) => {
      if (!expandedField) return;
      if (expandedField.kind === 'code' && expandedField.language === 'json') {
        if (next.trim() === '') {
          handleFieldChange(expandedField, undefined);
          return;
        }
        try {
          handleFieldChange(expandedField, JSON.parse(next));
        } catch {
          // Keep the last valid fragment value while the draft is invalid.
        }
        return;
      }
      handleFieldChange(expandedField, next);
    },
    [expandedField, handleFieldChange]
  );

  const handleExpandField = useCallback((field: StepFormField) => {
    setExpandedField(field);
  }, []);

  const handleFieldEditorBack = useCallback(() => {
    setExpandedField(null);
  }, []);

  const catalogLabel = useMemo(
    () => resolveCatalogLabel(stepType, connectors, actionLabel),
    [stepType, connectors, actionLabel]
  );

  const committedStepName = typeof parsed.js?.name === 'string' ? parsed.js.name.trim() : '';
  const displayName = isEditingName ? nameDraft.trim() : committedStepName;
  // Instance name matches the canvas node; empty / insert-before-name falls back to catalog.
  const headerTitle = displayName || catalogLabel;

  const beginNameEdit = useCallback(() => {
    const current = committedStepName;
    nameEditBaselineRef.current = current;
    setNameDraft(current);
    setNameError(undefined);
    isEditingNameRef.current = true;
    setIsEditingName(true);
    window.requestAnimationFrame(() => {
      const el = nameInputRef.current;
      if (!el) return;
      el.focus();
      el.select();
    });
  }, [committedStepName]);

  const revertNameEdit = useCallback(() => {
    isEditingNameRef.current = false;
    setIsEditingName(false);
    setNameDraft(nameEditBaselineRef.current);
    setNameError(undefined);
  }, []);

  const commitNameEdit = useCallback(() => {
    if (!isEditingNameRef.current) return;
    const next = nameDraft.trim();
    if (!next) {
      setNameError(
        i18n.translate('workflows.stepConfigPanel.stepNameRequired', {
          defaultMessage: 'Step name is required',
        })
      );
      return;
    }
    if (next !== nameEditBaselineRef.current.trim() && siblingStepNames.has(next)) {
      setNameError(
        i18n.translate('workflows.stepConfigPanel.stepNameDuplicate', {
          defaultMessage: 'A step named "{name}" already exists',
          values: { name: next },
        })
      );
      return;
    }
    // TODO(slice4): renaming does not rewrite steps.<old-name> references elsewhere.
    setFragment((current) =>
      writeFragmentValue(
        current,
        { key: 'name', path: ['name'], label: 'Step name', required: true, kind: 'text' },
        next,
        indent
      )
    );
    isEditingNameRef.current = false;
    setIsEditingName(false);
    setNameError(undefined);
  }, [nameDraft, siblingStepNames, indent]);

  // The stateful shell live-applies every valid draft straight to the YAML;
  // a draft with blocking errors (empty name, unparseable mid-edit value, or
  // invalid YAML) is never written. Block only those — not advisory field
  // validation, which can still be applied.
  const hasBlockingDraftErrors = useMemo(() => {
    if (draftErrors.size > 0) return true;
    return isEmptyFieldValue(committedStepName);
  }, [draftErrors, committedStepName]);

  const canApplyDraft = parsed.valid && !hasBlockingDraftErrors;

  const closeLabel = i18n.translate('workflows.stepConfigPanel.close', {
    defaultMessage: 'Close',
  });
  const stepNameLabel = i18n.translate('workflows.stepConfigPanel.stepName', {
    defaultMessage: 'Step name',
  });
  const editNameLabel = i18n.translate('workflows.stepConfigPanel.editStepName', {
    defaultMessage: 'Edit step name',
  });

  // ✕ / Escape share one close-attempt path: an un-appliable draft (the YAML
  // the stateful shell never wrote) prompts before discarding it; otherwise
  // the flyout just closes — everything else is already live in the YAML.
  // Skipped while the step-name editor is active (Escape there reverts the
  // name instead).
  const attemptClose = useCallback(() => {
    if (isEditingNameRef.current) return;
    if (!canApplyDraft) {
      setShowValidation(true);
      setShowDiscardConfirm(true);
      return;
    }
    onClose();
  }, [canApplyDraft, onClose]);

  const handleKeepEditing = useCallback(() => {
    setShowDiscardConfirm(false);
  }, []);

  const handleDiscardInvalidDraft = useCallback(() => {
    setShowDiscardConfirm(false);
    onClose();
  }, [onClose]);

  const showSettings = !isFallbackStep && stepSupportsErrorHandling(stepType);
  const stepCondition = schema?.condition;

  const editorModeOptions: Array<{
    id: ParametersMode;
    iconType: string;
    label: string;
  }> = [
    {
      id: 'form',
      iconType: 'workflow',
      label: i18n.translate('workflows.stepConfigPanel.formTab', {
        defaultMessage: 'Form',
      }),
    },
    {
      id: 'yaml',
      iconType: 'code',
      label: i18n.translate('workflows.stepConfigPanel.yamlTab', {
        defaultMessage: 'YAML',
      }),
    },
  ];

  const isBuilderMode = parametersMode === 'form';
  const chip = resolveNodeChipStyle(euiTheme, stepType, false, {
    isSuccess: false,
    isFailed: false,
  });

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      aria-describedby={typeSubtitleId}
      data-test-subj="workflowStepConfigPanel"
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          if (showDiscardConfirm) return;
          attemptClose();
        }
      }}
      css={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
        position: 'relative',
        background: euiTheme.colors.backgroundBasePlain,
      }}
    >
      <div
        css={{
          flex: '0 0 auto',
          borderBottom: `${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBaseSubdued}`,
          // Keep Form / YAML tabs flush on the header border.
          paddingBottom: 0,
        }}
      >
        <div
          css={{
            display: 'flex',
            alignItems: 'center',
            gap: euiTheme.size.m,
            // Leave room on the right for the absolutely positioned ✕.
            // No bottom padding — tabs sit flush under the title row.
            padding: `${euiTheme.size.base} ${euiTheme.size.xl} 0 ${euiTheme.size.base}`,
          }}
        >
          {/*
            Header: icon · name · pencil · close, with the step type id under the name. The
            icon is per provider family, so it does not tell `data.set` from `data.map`. The
            friendly label is left out on purpose.
          */}
          <div
            css={{
              display: 'flex',
              alignItems: 'center',
              gap: euiTheme.size.m,
              minWidth: 0,
              flex: '1 1 auto',
            }}
          >
            <span
              css={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                // Match canvas / Actions menu chip palette for this step type.
                width: euiTheme.size.xxl,
                height: euiTheme.size.xxl,
                flex: '0 0 auto',
                borderRadius: euiTheme.border.radius.small,
                border: `1px solid ${chip.border}`,
                background: chip.background,
              }}
            >
              {/*
                Match canvas / Actions menu glyph tinting: mask-based StepIcons
                honor `iconColor`, but EUI glyphs (e.g. `branch` for if) need
                the SVG fill wrapper used by NodeStepIcon.
              */}
              <span
                css={[
                  { color: chip.iconColor, display: 'inline-flex', lineHeight: 0 },
                  chip.iconColor ? { '& svg, & svg *': { fill: chip.iconColor } } : undefined,
                ]}
              >
                <StepIcon
                  stepType={stepType}
                  executionStatus={undefined}
                  size="m"
                  iconColor={chip.iconColor}
                  color={chip.iconColor}
                />
              </span>
            </span>
            <div css={{ minWidth: 0, flex: '1 1 auto' }}>
              {isEditingName ? (
                <div
                  css={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: euiTheme.size.xs,
                    minHeight: euiTheme.size.xl,
                    justifyContent: 'center',
                  }}
                >
                  <span id={titleId} hidden>
                    {headerTitle}
                  </span>
                  <EuiFieldText
                    inputRef={(el) => {
                      nameInputRef.current = el;
                    }}
                    compressed
                    fullWidth
                    value={nameDraft}
                    isInvalid={Boolean(nameError)}
                    aria-label={stepNameLabel}
                    data-test-subj="workflowStepConfigPanelNameInput"
                    // Step name is not templatable — reject reference drops.
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'none';
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onChange={(e) => {
                      setNameDraft(e.target.value);
                      if (nameError) setNameError(undefined);
                    }}
                    onBlur={commitNameEdit}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        commitNameEdit();
                      } else if (e.key === 'Escape') {
                        e.preventDefault();
                        e.stopPropagation();
                        revertNameEdit();
                      }
                    }}
                    css={{
                      // Metric-neutral with EuiTitle size="xxs" (maps to font scale `s`).
                      fontWeight: euiTheme.font.weight.bold,
                      fontSize: euiTheme.font.scale.s * euiTheme.base,
                      lineHeight: euiTheme.size.xl,
                      height: euiTheme.size.xl,
                      minHeight: euiTheme.size.xl,
                      paddingBlock: 0,
                      paddingInline: euiTheme.size.xs,
                    }}
                  />
                  {nameError ? (
                    <EuiText
                      size="xs"
                      color="danger"
                      data-test-subj="workflowStepConfigPanelNameError"
                    >
                      {nameError}
                    </EuiText>
                  ) : null}
                </div>
              ) : (
                <EuiTitle size="xxs">
                  <h2
                    id={titleId}
                    css={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: euiTheme.size.xs,
                      minHeight: euiTheme.size.xl,
                      maxWidth: '100%',
                      margin: 0,
                    }}
                  >
                    <EuiToolTip content={headerTitle} disableScreenReaderOutput>
                      <button
                        type="button"
                        onClick={beginNameEdit}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            beginNameEdit();
                          }
                        }}
                        aria-label={editNameLabel}
                        data-test-subj="workflowStepConfigPanelTitle"
                        css={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          minWidth: 0,
                          flex: '1 1 auto',
                          minHeight: euiTheme.size.xl,
                          padding: 0,
                          border: 'none',
                          background: 'transparent',
                          cursor: 'pointer',
                          color: 'inherit',
                          font: 'inherit',
                          fontWeight: 'inherit',
                          textAlign: 'left',
                          overflow: 'hidden',
                          '&:focus': { outline: 'none' },
                          '&:focus-visible': {
                            outline: `2px solid ${euiTheme.colors.primary}`,
                            outlineOffset: 1,
                          },
                        }}
                      >
                        <span
                          css={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {headerTitle}
                        </span>
                      </button>
                    </EuiToolTip>
                    <EuiButtonIcon
                      iconType="pencil"
                      size="xs"
                      color="text"
                      aria-label={editNameLabel}
                      onClick={beginNameEdit}
                      data-test-subj="workflowStepConfigPanelEditName"
                      css={{ flex: '0 0 auto' }}
                    />
                  </h2>
                </EuiTitle>
              )}
              {/* Outside the rename button: plain, selectable text. */}
              <code
                id={typeSubtitleId}
                title={stepType}
                data-test-subj="workflowStepConfigPanelTypeSubtitle"
                css={{
                  display: 'block',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  fontFamily: euiTheme.font.familyCode,
                  fontSize: euiTheme.font.scale.xs * euiTheme.base,
                  lineHeight: euiTheme.size.base,
                  color: euiTheme.colors.textSubdued,
                  background: 'transparent',
                  padding: 0,
                }}
              >
                {stepType}
              </code>
            </div>
          </div>
        </div>
        <EuiToolTip content={closeLabel} disableScreenReaderOutput>
          <EuiButtonIcon
            iconType="cross"
            color="text"
            aria-label={closeLabel}
            onClick={attemptClose}
            data-test-subj="workflowStepConfigPanelClose"
            css={{
              position: 'absolute',
              top: euiTheme.size.s,
              right: euiTheme.size.s,
              zIndex: 1,
            }}
          />
        </EuiToolTip>
        <EuiTabs
          size="s"
          bottomBorder={false}
          data-test-subj="workflowStepConfigPanelTabs"
          aria-label={i18n.translate('workflows.stepConfigPanel.editorModeLegend', {
            defaultMessage: 'Step editor mode',
          })}
          css={{
            paddingInline: euiTheme.size.base,
            marginBlockStart: 0,
          }}
        >
          {editorModeOptions.map((option) => (
            <EuiTab
              key={option.id}
              isSelected={parametersMode === option.id}
              onClick={() => setParametersMode(option.id)}
              prepend={<EuiIcon type={option.iconType} aria-hidden />}
              data-test-subj={`workflowStepConfigPanelView-${option.id}`}
            >
              {option.label}
            </EuiTab>
          ))}
        </EuiTabs>
      </div>

      <div
        css={{
          flex: '1 1 auto',
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div
          css={{
            flex: '1 1 auto',
            minHeight: 0,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column' as const,
            boxSizing: 'border-box' as const,
            height: '100%',
          }}
        >
          {!isBuilderMode ? (
            <FlyoutMonacoFrame>
              <CodeEditor
                languageId={YAML_LANG_ID}
                chromeOverrides={workflowsEditorChromeOverrides}
                value={fragment}
                onChange={setFragment}
                editorDidMount={onYamlEditorMount}
                height="100%"
                aria-label={i18n.translate('workflows.stepConfigPanel.yamlAriaLabel', {
                  defaultMessage: 'Step YAML',
                })}
                options={getFlyoutMonacoEditorOptions(euiTheme, { tabSize: indent })}
                dataTestSubj="workflowStepConfigPanelYaml"
              />
            </FlyoutMonacoFrame>
          ) : (
            <div
              css={{
                flex: '1 1 auto',
                minHeight: 0,
                width: '100%',
                overflow: 'auto',
              }}
            >
              <div
                css={{
                  display: 'flex',
                  flexDirection: 'column',
                  padding: euiTheme.size.base,
                  boxSizing: 'border-box' as const,
                }}
              >
                {parsed.valid ? (
                  <StepForm
                    key={initialFragment}
                    stepType={stepType}
                    fields={fields}
                    hasSchema={schema !== undefined}
                    fragment={fragment}
                    showValidation={showValidation}
                    referenceCatalog={referenceCatalog}
                    onChange={handleFieldChange}
                    onDraftErrorChange={handleDraftErrorChange}
                    onExpandField={handleExpandField}
                  />
                ) : (
                  <EuiText
                    size="s"
                    color="danger"
                    data-test-subj="workflowStepConfigPanelFormBlocked"
                  >
                    {i18n.translate('workflows.stepConfigPanel.invalidYamlForForm', {
                      defaultMessage: 'Fix the YAML to edit this step as a form. {error}',
                      values: { error: parsed.error ?? '' },
                    })}
                  </EuiText>
                )}

                <EuiHorizontalRule margin="m" />

                <EuiAccordion
                  id={settingsAccordionId}
                  forceState={settingsOpen ? 'open' : 'closed'}
                  onToggle={handleSettingsToggle}
                  paddingSize="none"
                  buttonContent={
                    <EuiTitle size="xxs">
                      <h4>
                        {i18n.translate('workflows.stepConfigPanel.settingsAccordion', {
                          defaultMessage: 'Advanced',
                        })}
                      </h4>
                    </EuiTitle>
                  }
                  data-test-subj="workflowStepConfigPanelAccordion-settings"
                >
                  <div
                    data-test-subj="workflowStepConfigPanelSettings"
                    css={{ paddingTop: euiTheme.size.m }}
                  >
                    {stepCondition ? (
                      <div
                        data-test-subj="workflowStepConfigConditionSection"
                        css={{ marginBlockEnd: euiTheme.size.l }}
                      >
                        <EuiTitle size="xxs" css={{ marginBlockEnd: euiTheme.size.s }}>
                          <h5>
                            {i18n.translate('workflows.stepConfigPanel.conditionTitle', {
                              defaultMessage: 'Conditional execution',
                            })}
                          </h5>
                        </EuiTitle>
                        <StepFieldRow
                          field={stepCondition}
                          value={toJs(readFragmentValue(fragment, stepCondition.path))}
                          showValidation={showValidation}
                          referenceCatalog={referenceCatalog}
                          showOptionalMarker={false}
                          onChange={(value) => handleFieldChange(stepCondition, value)}
                          onDraftErrorChange={(error) =>
                            handleDraftErrorChange(fieldId(stepCondition), error)
                          }
                          onExpand={() => handleExpandField(stepCondition)}
                          renderSubField={renderNoSubFields}
                        />
                      </div>
                    ) : null}
                    {showSettings ? (
                      <div data-test-subj="workflowStepConfigErrorHandlingSection">
                        <EuiTitle size="xxs" css={{ marginBlockEnd: euiTheme.size.s }}>
                          <h5>
                            {i18n.translate('workflows.stepConfigPanel.errorHandlingTitle', {
                              defaultMessage: 'Error handling',
                            })}
                          </h5>
                        </EuiTitle>
                        <StepErrorHandlingSection
                          fragment={fragment}
                          indent={indent}
                          onFragmentChange={setFragment}
                        />
                      </div>
                    ) : (
                      <EuiText size="s" color="subdued">
                        {i18n.translate('workflows.stepConfigPanel.settingsUnavailable', {
                          defaultMessage: 'Error handling is not available for this step.',
                        })}
                      </EuiText>
                    )}
                  </div>
                </EuiAccordion>
              </div>
            </div>
          )}
        </div>
      </div>

      <div
        css={{
          flex: '0 0 auto',
          borderTop: `${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBaseSubdued}`,
          paddingBlock: euiTheme.size.base,
          paddingInline: euiTheme.size.base,
        }}
      >
        <EuiFlexGroup justifyContent="flexEnd" gutterSize="m" responsive={false}>
          <EuiFlexItem grow={false}>
            {mode === 'insert' ? (
              <EuiButtonEmpty
                color="danger"
                iconType="trash"
                onClick={onRevert}
                data-test-subj="workflowStepConfigPanelRemoveNode"
              >
                {i18n.translate('workflows.stepConfigPanel.removeNode', {
                  defaultMessage: 'Remove node',
                })}
              </EuiButtonEmpty>
            ) : (
              <EuiButtonEmpty
                iconType="undo"
                onClick={onRevert}
                isDisabled={!isDraftDirty(fragment, initialFragment)}
                data-test-subj="workflowStepConfigPanelResetNode"
              >
                {i18n.translate('workflows.stepConfigPanel.resetNode', {
                  defaultMessage: 'Reset node',
                })}
              </EuiButtonEmpty>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>

      {expandedField ? (
        <div
          css={{
            position: 'absolute',
            inset: 0,
            zIndex: 3,
            background: euiTheme.colors.backgroundBasePlain,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
          }}
        >
          <FieldEditorSubFlyout
            fieldLabel={expandedField.label}
            value={expandedFieldValue}
            onChange={handleExpandedFieldChange}
            catalog={referenceCatalog}
            runControls={runControls}
            language={expandedField.kind === 'code' ? expandedField.language : undefined}
            valueFormWhenWhole={expandedField.valueFormWhenWhole}
            onBack={handleFieldEditorBack}
            onCloseStack={attemptClose}
          />
        </div>
      ) : null}

      {showDiscardConfirm ? (
        <EuiConfirmModal
          title={i18n.translate('workflows.stepConfigPanel.discardTitle', {
            defaultMessage: 'Discard changes to this step?',
          })}
          onCancel={handleKeepEditing}
          onConfirm={handleDiscardInvalidDraft}
          cancelButtonText={i18n.translate('workflows.stepConfigPanel.keepEditing', {
            defaultMessage: 'Keep editing',
          })}
          confirmButtonText={i18n.translate('workflows.stepConfigPanel.discard', {
            defaultMessage: 'Discard',
          })}
          buttonColor="danger"
          defaultFocusedButton="cancel"
          data-test-subj="workflowStepConfigPanelDiscardModal"
        >
          <EuiText size="s">
            {i18n.translate('workflows.stepConfigPanel.discardInvalidBody', {
              defaultMessage:
                "This draft has errors and wasn't applied to the step. Closing now will discard it.",
            })}
          </EuiText>
        </EuiConfirmModal>
      ) : null}
    </div>
  );
}

function StepForm({
  stepType,
  fields,
  hasSchema,
  fragment,
  showValidation,
  referenceCatalog,
  onChange,
  onDraftErrorChange,
  onExpandField,
}: {
  stepType: string;
  fields: readonly StepFormField[];
  /** False when no connector/built-in schema was resolved for this step type. */
  hasSchema: boolean;
  fragment: string;
  showValidation: boolean;
  referenceCatalog: ReturnType<typeof buildDataReferenceCatalog>;
  onChange: (field: StepFormField, value: unknown) => void;
  onDraftErrorChange: (id: string, error: string | undefined) => void;
  onExpandField: (field: StepFormField) => void;
}) {
  const { euiTheme } = useEuiTheme();
  const inputsAccordionId = useGeneratedHtmlId({ prefix: 'workflowStepConfigInputs' });
  const [optionalPickerOpen, setOptionalPickerOpen] = useState(false);

  // Primary = required or `advanced: false` (promoted). Everything else is optional
  // and only appears after the user adds it (or when it already has a value).
  const { primaryFields, optionalFields } = useMemo(() => {
    const primary: StepFormField[] = [];
    const optional: StepFormField[] = [];
    for (const field of fields) {
      if (field.required || field.advanced === false) primary.push(field);
      else optional.push(field);
    }
    return { primaryFields: primary, optionalFields: optional };
  }, [fields]);

  const optionalById = useMemo(() => {
    const map = new Map<string, StepFormField>();
    for (const field of optionalFields) map.set(fieldId(field), field);
    return map;
  }, [optionalFields]);

  // Cleared values: an added optional field stays in the form until explicitly
  // removed — no disappearing mid-edit when the user clears the input.
  const [revealedOptionalIds, setRevealedOptionalIds] = useState<readonly string[]>(() => {
    const ids: string[] = [];
    for (const field of optionalFields) {
      if (!isEmptyFieldValue(toJs(readFragmentValue(fragment, field.path)))) {
        ids.push(fieldId(field));
      }
    }
    return ids;
  });

  // Auto-reveal optionals that gain a value (e.g. YAML tab edits). Never auto-hide.
  useEffect(() => {
    setRevealedOptionalIds((prev) => {
      let next: string[] | undefined;
      for (const field of optionalFields) {
        const id = fieldId(field);
        if (prev.includes(id)) continue;
        if (isEmptyFieldValue(toJs(readFragmentValue(fragment, field.path)))) continue;
        if (!next) next = [...prev];
        next.push(id);
      }
      return next ?? prev;
    });
  }, [fragment, optionalFields]);

  const revealedOptionalFields = useMemo(() => {
    const out: StepFormField[] = [];
    for (const id of revealedOptionalIds) {
      const field = optionalById.get(id);
      if (field) out.push(field);
    }
    return out;
  }, [optionalById, revealedOptionalIds]);

  const availableOptionalFields = useMemo(
    () => optionalFields.filter((field) => !revealedOptionalIds.includes(fieldId(field))),
    [optionalFields, revealedOptionalIds]
  );

  const formStackCss = {
    '.workflowStepConfigFieldRow + .workflowStepConfigFieldRow': {
      marginTop: euiTheme.size.l,
    },
  };

  const removeOptionalField = useCallback(
    (field: StepFormField) => {
      const id = fieldId(field);
      setRevealedOptionalIds((prev) => prev.filter((x) => x !== id));
      onChange(field, undefined);
      onDraftErrorChange(id, undefined);
    },
    [onChange, onDraftErrorChange]
  );

  const renderField = (
    field: StepFormField,
    options: { removable: boolean; showOptionalMarker?: boolean }
  ) => {
    if (stepType === 'switch' && field.key === 'cases') {
      return (
        <div key={fieldId(field)} className="workflowStepConfigFieldRow">
          <SwitchCasesField
            value={toJs(readFragmentValue(fragment, field.path))}
            onChange={(next) => onChange(field, next)}
          />
        </div>
      );
    }

    return (
      <StepFieldRow
        key={fieldId(field)}
        field={field}
        value={toJs(readFragmentValue(fragment, field.path))}
        showValidation={showValidation}
        referenceCatalog={referenceCatalog}
        showOptionalMarker={options.showOptionalMarker ?? !field.required}
        onRemove={options.removable ? () => removeOptionalField(field) : undefined}
        onChange={(value) => onChange(field, value)}
        onDraftErrorChange={(error) => onDraftErrorChange(fieldId(field), error)}
        onExpand={() => onExpandField(field)}
        renderSubField={(subField, subOptions) =>
          renderField(subField, { removable: false, ...subOptions })
        }
      />
    );
  };

  const addOptionalField = useCallback((field: StepFormField) => {
    const id = fieldId(field);
    setRevealedOptionalIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setOptionalPickerOpen(false);
  }, []);

  const optionalPickerItems = availableOptionalFields.map((field) => (
    <EuiContextMenuItem
      key={fieldId(field)}
      onClick={() => addOptionalField(field)}
      data-test-subj={`workflowStepConfigAddOptionalOption-${fieldId(field)}`}
    >
      {field.label}
    </EuiContextMenuItem>
  ));

  const addOptionalButton =
    availableOptionalFields.length > 0 ? (
      <EuiPopover
        isOpen={optionalPickerOpen}
        closePopover={() => setOptionalPickerOpen(false)}
        panelPaddingSize="none"
        anchorPosition="downLeft"
        button={
          <EuiButtonEmpty
            size="xs"
            flush="both"
            color="primary"
            iconType="plusCircle"
            onClick={(e) => {
              e.stopPropagation();
              setOptionalPickerOpen((open) => !open);
            }}
            data-test-subj="workflowStepConfigAddOptionalField"
          >
            {i18n.translate('workflows.stepConfigPanel.addOptionalField', {
              defaultMessage: 'Add optional',
            })}
          </EuiButtonEmpty>
        }
      >
        <EuiContextMenuPanel
          size="s"
          items={optionalPickerItems}
          data-test-subj="workflowStepConfigOptionalFieldMenu"
        />
      </EuiPopover>
    ) : undefined;

  return (
    <EuiAccordion
      id={inputsAccordionId}
      initialIsOpen
      paddingSize="none"
      buttonContent={
        <EuiTitle size="xxs">
          <h4>
            {i18n.translate('workflows.stepConfigPanel.inputsAccordion', {
              defaultMessage: 'Inputs',
            })}
          </h4>
        </EuiTitle>
      }
      extraAction={addOptionalButton}
      data-test-subj="workflowStepConfigPanelAccordion-inputs"
      css={{
        // Keep the Inputs row reachable while the form scrolls beneath it.
        '.euiAccordion__triggerWrapper': {
          position: 'sticky',
          top: 0,
          zIndex: 2,
          background: euiTheme.colors.backgroundBasePlain,
        },
      }}
    >
      <div data-test-subj="workflowStepConfigPanelForm" css={{ paddingTop: 12 }}>
        {fields.length === 0 ? (
          <EuiEmptyPrompt
            paddingSize="m"
            titleSize="xs"
            iconType={hasSchema ? 'checkCircleFill' : 'code'}
            title={
              <h3>
                {hasSchema
                  ? i18n.translate('workflows.stepConfigPanel.noInputsTitle', {
                      defaultMessage: 'No configuration needed',
                    })
                  : i18n.translate('workflows.stepConfigPanel.formUnavailableTitle', {
                      defaultMessage: 'Form unavailable',
                    })}
              </h3>
            }
            body={
              <EuiText size="s" color="subdued">
                {hasSchema
                  ? i18n.translate('workflows.stepConfigPanel.noInputsBody', {
                      defaultMessage:
                        'This step has no inputs to set. You can still rename it above or configure Advanced.',
                    })
                  : i18n.translate('workflows.stepConfigPanel.formUnavailableBody', {
                      defaultMessage:
                        'This step type is not mapped to a form. Switch to YAML to edit its configuration.',
                    })}
              </EuiText>
            }
            data-test-subj="workflowStepConfigPanelEmpty"
          />
        ) : (
          <div css={formStackCss} data-test-subj="workflowStepConfigPrimaryFields">
            {primaryFields.map((field) => renderField(field, { removable: false }))}
            {revealedOptionalFields.map((field) => renderField(field, { removable: true }))}
          </div>
        )}
      </div>
    </EuiAccordion>
  );
}

/** The info icon of a moved description, for the slot a field's label leaves for it. */
const FieldDescriptionIconContext = createContext<React.ReactNode>(null);

/** At the end of a field's label, after its title, YAML key and "Optional". */
function FieldDescriptionIconSlot() {
  const icon = useContext(FieldDescriptionIconContext);
  return icon ? <span css={{ display: 'inline-flex', alignSelf: 'center' }}>{icon}</span> : null;
}

/**
 * EuiFormRow wrapper that forbids invalid-without-error — color is never the
 * only signal. When `isInvalid`, `error` is required.
 */
function StepValidatedFormRow({
  isInvalid,
  error,
  helpText,
  description,
  children,
  ...rest
}: React.ComponentProps<typeof EuiFormRow> & {
  /** The schema description: under the control while it is short, behind an info icon when long. */
  readonly description?: string;
}) {
  // `helpText` is the status or hint for the control ("Defined in YAML", the fixed-only note):
  // it is always under it.
  const { fontSize, lineHeight } = useEuiFontSize('xs');
  const descriptionId = useGeneratedHtmlId({ prefix: 'workflowStepConfigDescription' });
  const { measureRef, isLong } = useDescriptionOverflow(description);
  if (isInvalid && (error === undefined || error === null || error === '')) {
    throw new Error('StepValidatedFormRow: isInvalid requires a visible error message');
  }
  const inlineDescription = isLong ? undefined : description;
  const underControl =
    inlineDescription && helpText ? (
      <>
        {inlineDescription} {helpText}
      </>
    ) : (
      inlineDescription ?? helpText
    );
  const descriptionIcon =
    description && isLong ? (
      <EuiIconTip
        type="info"
        color="subdued"
        content={description}
        aria-label={i18n.translate('workflows.stepConfigPanel.fieldDescriptionIcon', {
          defaultMessage: 'About this field',
        })}
        anchorProps={{
          'data-test-subj': 'workflowStepConfigFieldDescriptionIcon',
          // The icon sits inside the row's <label>: a click must not reach the control it labels.
          onClick: (event) => event.preventDefault(),
        }}
      />
    ) : undefined;
  return (
    <div css={{ position: 'relative' }}>
      <FieldDescriptionIconContext.Provider value={descriptionIcon}>
        <EuiFormRow
          {...rest}
          isInvalid={isInvalid}
          error={isInvalid ? error : undefined}
          helpText={isInvalid ? undefined : underControl}
          // A hidden element can still describe the control, so a moved description stays announced.
          describedByIds={isLong ? [descriptionId] : undefined}
        >
          {children}
        </EuiFormRow>
      </FieldDescriptionIconContext.Provider>
      {description ? (
        <div
          ref={measureRef}
          id={descriptionId}
          css={{
            position: 'absolute',
            insetInline: 0,
            top: 0,
            visibility: 'hidden',
            pointerEvents: 'none',
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitBoxOrient: 'vertical',
            WebkitLineClamp: DESCRIPTION_MAX_LINES,
            fontSize,
            lineHeight,
          }}
        >
          {description}
        </div>
      ) : null}
    </div>
  );
}

function StepFieldRow({
  field,
  value,
  showValidation,
  referenceCatalog,
  showOptionalMarker,
  onRemove,
  onChange,
  onDraftErrorChange,
  onExpand,
  renderSubField,
}: {
  field: StepFormField;
  value: unknown;
  showValidation: boolean;
  referenceCatalog: ReturnType<typeof buildDataReferenceCatalog>;
  showOptionalMarker: boolean;
  onRemove?: () => void;
  onChange: (value: unknown) => void;
  onDraftErrorChange: (error: string | undefined) => void;
  onExpand: () => void;
  /** Renders a field of the chosen way of writing a `variants` field. */
  renderSubField: (
    field: StepFormField,
    options: { showOptionalMarker: boolean }
  ) => React.ReactElement;
}) {
  const { euiTheme } = useEuiTheme();
  const switchId = useGeneratedHtmlId({ prefix: `workflowStepConfigSwitch-${fieldId(field)}` });
  const [accused, setAccused] = useState(false);
  const [jsonDraftError, setJsonDraftError] = useState<string | undefined>();
  const fixedOnly = field.templatable === false;
  const testSubj = `workflowStepConfigField-${field.path.join('.')}`;
  // Fixed | Data: any whole reference is "Data". Switching to Data before anything is picked
  // keeps the typed value until a pick replaces it.
  // Lists whose items aren't typed text (`foreach`) usually come from earlier data: start there.
  const [forcedData, setForcedData] = useState(
    field.preferData === true && isEmptyFieldValue(value)
  );
  const valueIsReference = isReferenceValue(value);
  const source: ValueSource = !fixedOnly && (valueIsReference || forcedData) ? 'data' : 'fixed';

  useEffect(() => {
    if (showValidation) setAccused(true);
  }, [showValidation]);

  const onDraftErrorChangeRef = useRef(onDraftErrorChange);
  onDraftErrorChangeRef.current = onDraftErrorChange;
  // Clear parent draft-error slot only when this row unmounts — not when the
  // parent re-creates the callback identity on every render.
  useEffect(() => () => onDraftErrorChangeRef.current(undefined), []);

  const setDraftError = useCallback((error: string | undefined) => {
    setJsonDraftError(error);
    onDraftErrorChangeRef.current(error);
  }, []);

  const optionalLabel = i18n.translate('workflows.stepConfigPanel.optional', {
    defaultMessage: 'Optional',
  });
  const removeLabel = i18n.translate('workflows.stepConfigPanel.removeOptionalField', {
    defaultMessage: 'Remove field',
  });
  const representable = isFieldValueRepresentable(field, value);
  const schemaError = representable ? validateStepField(field, value) : undefined;
  const errorMessage = jsonDraftError ?? schemaError;
  // Slow accusation (blur/save), fast forgiveness once already marked invalid.
  const isInvalid = (showValidation || accused) && !!errorMessage;
  const showYamlKeyHint = fieldLabelDivergesFromKey(field.key, field.label);

  const accuseIfInvalid = useCallback(() => {
    const nextError =
      jsonDraftError ?? (representable ? validateStepField(field, value) : undefined);
    if (nextError) setAccused(true);
  }, [jsonDraftError, representable, field, value]);

  const labelContent = (
    <span css={{ display: 'inline-flex', alignItems: 'baseline', gap: euiTheme.size.xs }}>
      <span>{field.label}</span>
      {showYamlKeyHint ? (
        <EuiText
          size="xs"
          color="subdued"
          data-test-subj={`workflowStepConfigFieldKey-${field.path.join('.')}`}
          css={{ fontFamily: euiTheme.font.familyCode }}
        >
          {field.key}
        </EuiText>
      ) : null}
      {showOptionalMarker ? (
        <EuiText size="xs" color="subdued">
          {optionalLabel}
        </EuiText>
      ) : null}
      <FieldDescriptionIconSlot />
    </span>
  );

  const removeExpandedCss = {
    width: 18,
    minWidth: 18,
    opacity: 1,
    marginInlineStart: 6,
  };
  const removeExpandCss = {
    width: 0,
    minWidth: 0,
    opacity: 0,
    overflow: 'hidden' as const,
    marginInlineStart: 0,
    transition: 'width 140ms ease, opacity 140ms ease, margin 140ms ease',
    '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
    '&:hover': { color: euiTheme.colors.textDanger },
    // Always focusable; expand on own focus the same way row hover does.
    '&:focus, &:focus-visible': removeExpandedCss,
  };

  const handleSourceChange = (next: ValueSource) => {
    if (next === 'data') {
      setForcedData(true);
      return;
    }
    setForcedData(false);
    // Only a reference needs clearing; a typed value that was kept stays as it is.
    if (valueIsReference) {
      onChange(
        field.kind === 'list' ? [] : field.required && field.kind === 'boolean' ? false : undefined
      );
    }
  };
  const handleDataChange = (next: string | undefined) => {
    setForcedData(true);
    onChange(next);
  };
  // The whole-list side means "this reference is the list". A field that needs a list (no single
  // value allowed) cannot take a single value that way, so a pick known to be one value is added
  // as an entry instead (`["{{ x }}"]`), after the entries already there, and the field goes back
  // to its entries. Lists, and references of unknown type, are written as the whole list.
  const handleWholeListChange = (next: string | undefined) => {
    const picked = next === undefined ? undefined : parseWholeReference(next);
    if (
      !picked ||
      field.acceptsSingle === true ||
      !isSingleValueReference(
        picked.expression,
        lookupReferenceTypeLabel(referenceCatalog, picked.expression)
      )
    ) {
      handleDataChange(next);
      return;
    }
    setForcedData(false);
    const entries = valueIsReference ? [] : toTags(value);
    const entry = formatDataReferenceToken(picked.expression);
    onChange(entries.includes(entry) ? entries : [...entries, entry]);
  };
  // Data picked from the tags box. A known list or record is the whole list, which replaces the
  // entries (after a confirmation when there are some); anything else is one more entry, written
  // as text because that is what an entry of a text list is.
  const [pendingWholeList, setPendingWholeList] = useState<string | undefined>();
  const wholeListModalId = useGeneratedHtmlId({ prefix: 'workflowStepConfigWholeListModal' });
  const handleEntryPick = (token: string) => {
    const picked = parseWholeReference(token);
    if (!picked) return;
    if (
      isContainerReference(
        picked.expression,
        lookupReferenceTypeLabel(referenceCatalog, picked.expression)
      )
    ) {
      const wholeList = formatValueReferenceToken(picked.expression);
      if (toTags(value).length > 0) setPendingWholeList(wholeList);
      else handleDataChange(wholeList);
      return;
    }
    const entries = toTags(value);
    const entry = formatDataReferenceToken(picked.expression);
    onChange(
      entries.includes(entry)
        ? entries
        : fromTags([...entries, entry], field.acceptsSingle === true)
    );
  };
  // A list whose items aren't text (objects, numbers) stays in the JSON editor, as before.
  const listIsTags = field.kind === 'list' && isTagValue(value);
  // A JSON field takes Fixed | Data only when its schema says it usually holds a reference.
  const codeTakesData = field.kind === 'code' && field.preferData === true;
  const hasSourceToggle =
    !fixedOnly &&
    (field.kind === 'boolean' ||
      field.kind === 'number' ||
      field.kind === 'select' ||
      listIsTags ||
      codeTakesData);
  const sourceToggle = hasSourceToggle ? (
    <ValueSourceToggle
      source={source}
      fieldLabel={field.label}
      onChange={handleSourceChange}
      labels={
        listIsTags
          ? {
              fixed: i18n.translate('workflows.stepConfigPanel.valueSource.listEntries', {
                defaultMessage: 'Entries',
              }),
              data: i18n.translate('workflows.stepConfigPanel.valueSource.listFromData', {
                defaultMessage: 'From data',
              }),
            }
          : undefined
      }
      data-test-subj={`${testSubj}-source`}
    />
  ) : undefined;
  // Dropdowns hold text, so their reference is the text form; numbers and yes/no keep their type.
  const referenceForm: ReferenceForm = field.kind === 'select' ? 'text' : 'value';

  const removeControl = onRemove ? (
    <span
      css={{
        display: 'inline-flex',
        alignItems: 'center',
        // Expand ✕ on row hover / own focus.
        '.workflowStepConfigFieldRow:hover &, &:focus-within': {
          '[data-remove-field]': removeExpandedCss,
        },
      }}
    >
      <EuiButtonIcon
        iconType="cross"
        size="xs"
        color="text"
        title={removeLabel}
        aria-label={removeLabel}
        onClick={onRemove}
        data-remove-field=""
        data-test-subj={`workflowStepConfigRemoveOptional-${fieldId(field)}`}
        css={removeExpandCss}
      />
    </span>
  ) : undefined;

  // "Optional" sits right after the label; the remove ✕ and the Fixed | Data switch take the far side.
  const labelAppend =
    removeControl || sourceToggle ? (
      <span css={{ display: 'inline-flex', alignItems: 'center', gap: euiTheme.size.xs }}>
        {removeControl}
        {sourceToggle}
      </span>
    ) : undefined;

  const fixedOnlyHint = i18n.translate('workflows.stepConfigPanel.fixedOnlyHint', {
    defaultMessage: 'Read exactly as typed. Not a template.',
  });
  const fixedOnlyAppend = <EuiIcon type="lock" aria-hidden />;
  const description = representable ? field.description : undefined;
  // Status and hints stay under the control; only the description can move behind an icon.
  const helpText = !representable
    ? i18n.translate('workflows.stepConfigPanel.definedInYaml', {
        defaultMessage: 'Defined in YAML',
      })
    : fixedOnly
    ? fixedOnlyHint
    : undefined;

  if (!representable) {
    return (
      <div className="workflowStepConfigFieldRow">
        <StepValidatedFormRow
          label={labelContent}
          labelAppend={labelAppend}
          helpText={helpText}
          isInvalid={false}
          fullWidth
          display="row"
        >
          <EuiFieldText
            compressed
            fullWidth
            readOnly
            value={stringifyYaml(value).trim()}
            data-test-subj={`${testSubj}-readonly`}
          />
        </StepValidatedFormRow>
      </div>
    );
  }

  if (field.kind === 'boolean') {
    if (source === 'data') {
      return (
        <div className="workflowStepConfigFieldRow">
          <StepValidatedFormRow
            label={labelContent}
            labelAppend={labelAppend}
            description={description}
            helpText={helpText}
            isInvalid={isInvalid}
            error={errorMessage}
            fullWidth
            display="row"
          >
            <ReferenceValueBox
              catalog={referenceCatalog}
              value={value}
              form={referenceForm}
              onChange={handleDataChange}
              isInvalid={isInvalid}
              onBlur={accuseIfInvalid}
              ariaLabel={field.label}
              data-test-subj={testSubj}
            />
          </StepValidatedFormRow>
        </div>
      );
    }

    // This row has no label row to hold an icon, so its description always stays under it.
    const switchHelpText = [description, helpText].filter(Boolean).join(' ');
    return (
      <div
        className="euiFormRow workflowStepConfigFieldRow"
        css={{
          display: 'flex',
          flexDirection: 'column',
          rowGap: euiTheme.size.xs,
        }}
        data-test-subj={`${testSubj}-row`}
      >
        <div
          css={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: euiTheme.size.s,
            flexWrap: 'wrap',
          }}
        >
          <div
            css={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: euiTheme.size.s,
              minWidth: 0,
            }}
          >
            <label htmlFor={switchId} css={{ cursor: 'pointer' }}>
              {labelContent}
            </label>
            <EuiSwitch
              id={switchId}
              compressed
              label={field.label}
              showLabel={false}
              checked={value === true}
              onChange={(e) => onChange(e.target.checked)}
              aria-describedby={switchHelpText ? `${switchId}-help` : undefined}
              data-test-subj={testSubj}
            />
            {removeControl}
          </div>
          {sourceToggle}
        </div>
        {switchHelpText ? (
          <EuiText size="xs" color="subdued" id={`${switchId}-help`}>
            {switchHelpText}
          </EuiText>
        ) : null}
      </div>
    );
  }

  const rowProps = {
    label: labelContent,
    labelAppend,
    description,
    helpText,
    isInvalid,
    error: errorMessage,
    fullWidth: true,
    display: 'row' as const,
  };

  const wrapRow = (child: React.ReactElement) => (
    <div className="workflowStepConfigFieldRow">{child}</div>
  );

  const codeField: StepFormField =
    field.kind === 'list' ? { ...field, kind: 'code', language: 'json' } : field;

  switch (field.kind === 'list' && !listIsTags ? 'code' : field.kind) {
    case 'list':
      return wrapRow(
        <>
          <StepValidatedFormRow {...rowProps}>
            {source === 'data' ? (
              <ReferenceValueBox
                catalog={referenceCatalog}
                value={value}
                form={referenceForm}
                onChange={handleWholeListChange}
                isInvalid={isInvalid}
                onBlur={accuseIfInvalid}
                ariaLabel={field.label}
                // One string is a valid value too, so only a known list or record is flagged.
                keepTypeFor="containers"
                data-test-subj={testSubj}
              />
            ) : (
              <ListField
                value={value}
                onChange={onChange}
                options={field.options}
                acceptsSingle={field.acceptsSingle === true}
                catalog={referenceCatalog}
                onInsertReference={field.options ? undefined : handleEntryPick}
                ariaLabel={field.label}
                isInvalid={isInvalid}
                onBlur={accuseIfInvalid}
                data-test-subj={testSubj}
              />
            )}
          </StepValidatedFormRow>
          {pendingWholeList ? (
            <EuiConfirmModal
              aria-labelledby={wholeListModalId}
              title={i18n.translate('workflows.stepConfigPanel.list.replaceTitle', {
                defaultMessage: 'Replace the entries with this list?',
              })}
              titleProps={{ id: wholeListModalId }}
              onCancel={() => setPendingWholeList(undefined)}
              onConfirm={() => {
                handleDataChange(pendingWholeList);
                setPendingWholeList(undefined);
              }}
              cancelButtonText={i18n.translate('workflows.stepConfigPanel.list.replaceCancel', {
                defaultMessage: 'Cancel',
              })}
              confirmButtonText={i18n.translate('workflows.stepConfigPanel.list.replaceConfirm', {
                defaultMessage: 'Replace',
              })}
              data-test-subj={`${testSubj}-replaceConfirm`}
            >
              <p>
                {i18n.translate('workflows.stepConfigPanel.list.replaceBody', {
                  defaultMessage:
                    '{field} already has entries. Using the whole list from {reference} replaces them.',
                  values: {
                    field: field.label,
                    reference: parseWholeReference(pendingWholeList)?.expression ?? '',
                  },
                })}
              </p>
            </EuiConfirmModal>
          ) : null}
        </>
      );
    case 'number':
      return wrapRow(
        <StepValidatedFormRow {...rowProps}>
          {source === 'data' ? (
            <ReferenceValueBox
              catalog={referenceCatalog}
              value={value}
              form={referenceForm}
              onChange={handleDataChange}
              isInvalid={isInvalid}
              onBlur={accuseIfInvalid}
              ariaLabel={field.label}
              data-test-subj={testSubj}
            />
          ) : (
            <EuiFieldNumber
              compressed
              fullWidth
              isInvalid={isInvalid}
              value={typeof value === 'number' || typeof value === 'string' ? value : ''}
              onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
              onBlur={accuseIfInvalid}
              append={fixedOnly ? fixedOnlyAppend : undefined}
              data-test-subj={testSubj}
            />
          )}
        </StepValidatedFormRow>
      );
    case 'select': {
      const selectOptions = (field.options ?? []).map((o) => ({ label: o }));
      const strVal = value === undefined || value === null ? undefined : String(value);
      const selectedOptions = strVal !== undefined ? [{ label: strVal }] : [];
      return wrapRow(
        <StepValidatedFormRow {...rowProps}>
          {source === 'data' ? (
            <ReferenceValueBox
              catalog={referenceCatalog}
              value={value}
              form={referenceForm}
              onChange={handleDataChange}
              isInvalid={isInvalid}
              onBlur={accuseIfInvalid}
              ariaLabel={field.label}
              data-test-subj={testSubj}
            />
          ) : (
            <EuiComboBox
              aria-label={field.label}
              singleSelection={{ asPlainText: true }}
              options={selectOptions}
              selectedOptions={selectedOptions}
              onChange={(opts) => onChange(opts[0]?.label ?? undefined)}
              onCreateOption={(text) => onChange(text)}
              isClearable={false}
              compressed
              fullWidth
              isInvalid={isInvalid}
              onBlur={accuseIfInvalid}
              data-test-subj={testSubj}
            />
          )}
        </StepValidatedFormRow>
      );
    }
    case 'variants':
      return wrapRow(
        <VariantField
          field={field}
          value={value}
          onChange={onChange}
          renderField={renderSubField}
          label={labelContent}
          labelAppend={labelAppend}
          // The group carries the description; the fixed-only hint belongs to its control.
          helpText={field.description}
          data-test-subj={`${testSubj}-variantGroup`}
        />
      );
    case 'key-value':
      return wrapRow(
        <StepValidatedFormRow {...rowProps}>
          <KeyValueField
            value={value}
            onChange={onChange}
            catalog={referenceCatalog}
            fieldLabel={field.label}
            addLabel={
              field.path.length === 1
                ? i18n.translate('workflows.stepConfigPanel.keyValue.addVariable', {
                    defaultMessage: 'Add variable',
                  })
                : i18n.translate('workflows.stepConfigPanel.keyValue.addField', {
                    defaultMessage: 'Add field',
                  })
            }
            testSubj={testSubj}
            renderJsonValue={(cell) => (
              <CodeField
                field={{ ...field, kind: 'code', language: 'json', label: cell.ariaLabel }}
                value={cell.value}
                catalog={referenceCatalog}
                onChange={cell.onChange}
                testSubj={cell.testSubj}
                isInvalid={false}
                onBlur={accuseIfInvalid}
                onDraftErrorChange={cell.onDraftErrorChange}
              />
            )}
          />
        </StepValidatedFormRow>
      );
    case 'code':
      return wrapRow(
        <StepValidatedFormRow {...rowProps}>
          {codeTakesData && source === 'data' ? (
            <ReferenceValueBox
              catalog={referenceCatalog}
              value={value}
              form={referenceForm}
              onChange={handleDataChange}
              isInvalid={isInvalid}
              onBlur={accuseIfInvalid}
              ariaLabel={field.label}
              data-test-subj={testSubj}
            />
          ) : (
            <CodeField
              field={codeField}
              value={value}
              catalog={referenceCatalog}
              onChange={onChange}
              testSubj={testSubj}
              isInvalid={isInvalid}
              onBlur={accuseIfInvalid}
              onDraftErrorChange={setDraftError}
              // TODO(slice7): ES|QL keeps its specialized editor — no expand here.
              onExpand={field.language === 'esql' ? undefined : onExpand}
              fixedOnly={fixedOnly}
            />
          )}
        </StepValidatedFormRow>
      );
    case 'switch-cases': {
      interface CaseItem {
        match: unknown;
        steps: unknown[];
      }
      const casesArray = Array.isArray(value) ? (value as CaseItem[]) : [];
      const addCaseLabel = i18n.translate('workflows.stepConfigPanel.switchCases.addCase', {
        defaultMessage: 'Add case',
      });
      const deleteCaseLabel = i18n.translate('workflows.stepConfigPanel.switchCases.deleteCase', {
        defaultMessage: 'Delete case',
      });
      return wrapRow(
        <StepValidatedFormRow
          label={labelContent}
          labelAppend={labelAppend}
          description={description}
          helpText={helpText}
          isInvalid={isInvalid}
          error={errorMessage}
          fullWidth
          display="row"
        >
          <div css={{ display: 'flex', flexDirection: 'column', gap: euiTheme.size.xs }}>
            {casesArray.map((caseItem, idx) => (
              <div key={idx} css={{ display: 'flex', alignItems: 'center', gap: euiTheme.size.s }}>
                <EuiFieldText
                  compressed
                  fullWidth
                  value={String(caseItem.match ?? '')}
                  isInvalid={isInvalid}
                  onChange={(e) => {
                    const next = [...casesArray];
                    next[idx] = { ...caseItem, match: e.target.value };
                    onChange(next);
                  }}
                  onBlur={accuseIfInvalid}
                  data-test-subj={`${testSubj}-case-${idx}`}
                />
                <EuiButtonIcon
                  iconType="trash"
                  color="danger"
                  size="xs"
                  aria-label={deleteCaseLabel}
                  onClick={() => onChange(casesArray.filter((_, i) => i !== idx))}
                  data-test-subj={`${testSubj}-case-${idx}-delete`}
                />
              </div>
            ))}
            <div>
              <EuiButtonEmpty
                iconType="plusCircle"
                size="xs"
                flush="left"
                onClick={() => onChange([...casesArray, { match: '', steps: [] }])}
                data-test-subj={`${testSubj}-addCase`}
              >
                {addCaseLabel}
              </EuiButtonEmpty>
            </div>
          </div>
        </StepValidatedFormRow>
      );
    }
    case 'parallel-branches': {
      interface BranchItem {
        name?: unknown;
        steps: unknown[];
      }
      const branchesArray = Array.isArray(value) ? (value as BranchItem[]) : [];
      const addBranchLabel = i18n.translate(
        'workflows.stepConfigPanel.parallelBranches.addBranch',
        {
          defaultMessage: 'Add branch',
        }
      );
      const deleteBranchLabel = i18n.translate(
        'workflows.stepConfigPanel.parallelBranches.deleteBranch',
        { defaultMessage: 'Delete branch' }
      );
      return wrapRow(
        <StepValidatedFormRow
          label={labelContent}
          labelAppend={labelAppend}
          description={description}
          helpText={helpText}
          isInvalid={isInvalid}
          error={errorMessage}
          fullWidth
          display="row"
        >
          <div css={{ display: 'flex', flexDirection: 'column', gap: euiTheme.size.xs }}>
            {branchesArray.map((branch, idx) => (
              <div key={idx} css={{ display: 'flex', alignItems: 'center', gap: euiTheme.size.s }}>
                <EuiFieldText
                  compressed
                  fullWidth
                  value={branch.name !== undefined ? String(branch.name) : ''}
                  placeholder={`branch ${idx + 1}`}
                  isInvalid={isInvalid}
                  onChange={(e) => {
                    const next = [...branchesArray];
                    next[idx] = { ...branch, name: e.target.value };
                    onChange(next);
                  }}
                  onBlur={accuseIfInvalid}
                  data-test-subj={`${testSubj}-branch-${idx}`}
                />
                <EuiButtonIcon
                  iconType="trash"
                  color="danger"
                  size="xs"
                  aria-label={deleteBranchLabel}
                  onClick={() => onChange(branchesArray.filter((_, i) => i !== idx))}
                  data-test-subj={`${testSubj}-branch-${idx}-delete`}
                />
              </div>
            ))}
            <div>
              <EuiButtonEmpty
                iconType="plusCircle"
                size="xs"
                flush="left"
                onClick={() => onChange([...branchesArray, { name: '', steps: [] }])}
                data-test-subj={`${testSubj}-addBranch`}
              >
                {addBranchLabel}
              </EuiButtonEmpty>
            </div>
          </div>
        </StepValidatedFormRow>
      );
    }
    case 'text':
    default:
      if (fixedOnly) {
        return wrapRow(
          <StepValidatedFormRow {...rowProps}>
            <EuiFieldText
              compressed
              fullWidth
              isInvalid={isInvalid}
              value={value === undefined || value === null ? '' : String(value)}
              onChange={(e) => onChange(e.target.value)}
              onBlur={accuseIfInvalid}
              append={fixedOnlyAppend}
              data-test-subj={testSubj}
            />
          </StepValidatedFormRow>
        );
      }
      return wrapRow(
        <StepValidatedFormRow {...rowProps}>
          <ReferenceCapableField
            catalog={referenceCatalog}
            value={value === undefined || value === null ? '' : String(value)}
            onChange={onChange}
            onExpand={onExpand}
            openOnBrace
          >
            {(bind) => (
              <ReferenceTextInput
                bind={bind}
                catalog={referenceCatalog}
                ariaLabel={field.label}
                isInvalid={isInvalid}
                onBlur={accuseIfInvalid}
                onChange={bind.reportChange}
                testSubj={testSubj}
                warnContainersInSentence
              />
            )}
          </ReferenceCapableField>
        </StepValidatedFormRow>
      );
  }
}

/**
 * Templatable code-shaped Inputs field. Inline UI is always a single-line
 * `EuiFieldText` (whitespace-collapsed for display); multi-line editing is the
 * expand sub-flyout. ES|QL keeps its specialized Monaco editor (`// TODO(slice7)`).
 * JSON fields still round-trip through parse; invalid drafts stay local.
 */
function CodeField({
  field,
  value,
  catalog,
  onChange,
  testSubj,
  isInvalid,
  onBlur,
  onDraftErrorChange,
  onExpand,
  fixedOnly = false,
}: {
  field: StepFormField;
  value: unknown;
  catalog: ReturnType<typeof buildDataReferenceCatalog>;
  onChange: (value: unknown) => void;
  testSubj: string;
  isInvalid: boolean;
  onBlur: () => void;
  onDraftErrorChange: (error: string | undefined) => void;
  onExpand?: () => void;
  /** The engine reads this value exactly as typed: no picker, no references. */
  fixedOnly?: boolean;
}) {
  const { euiTheme, colorMode } = useEuiTheme();
  const isJson = field.language === 'json';
  const isEsql = field.language === 'esql';
  const isJsonLiquid = field.language === 'json-liquid';
  // These keep their text exactly as typed, in an inline Monaco editor.
  const usesInlineMonaco = isEsql || isJsonLiquid;
  const controlPaddingPx = parseInt(String(euiTheme.size.m), 10);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<{
    focus: () => void;
    getCaret: () => number;
    setCaret: (offset: number) => void;
  } | null>(null);
  const [editorHeight, setEditorHeight] = useState(CODE_EDITOR_HEIGHT);
  const [esqlEditor, setEsqlEditor] = useState<monaco.editor.IStandaloneCodeEditor | null>(null);
  const [dismissedWarnings, setDismissedWarnings] = useState<ReadonlySet<string>>(() => new Set());
  const iconMasks = useReferenceIconMasks();

  const external = useMemo(() => {
    if (value === undefined || value === null) return '';
    if ((isJson || isJsonLiquid) && typeof value !== 'string')
      return JSON.stringify(value, null, 2);
    return String(value);
  }, [value, isJson, isJsonLiquid]);

  // Inline Inputs show a whitespace-collapsed string; the document keeps the
  // original until the user edits (or expands and edits in the sub-flyout).
  const [draft, setDraft] = useState(() =>
    usesInlineMonaco ? external : collapseWhitespaceForDisplay(external)
  );

  useEffect(() => {
    setDraft(usesInlineMonaco ? external : collapseWhitespaceForDisplay(external));
    onDraftErrorChange(undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onDraftErrorChange is intentionally omitted
  }, [external, usesInlineMonaco]);

  const esqlTokens = useMemo(
    () =>
      usesInlineMonaco
        ? findReferenceTokens(draft, { catalog, warnContainersInSentence: isJsonLiquid })
        : [],
    [catalog, draft, usesInlineMonaco, isJsonLiquid]
  );
  useReferenceDecorations(esqlEditor, draft, esqlTokens);
  const containerWarning = esqlTokens.find(
    (token) => token.isContainerInSentence && !dismissedWarnings.has(token.expression)
  );

  useEffect(() => {
    if (!usesInlineMonaco) return;
    const shell = shellRef.current;
    if (!shell || typeof ResizeObserver === 'undefined') return;
    const syncHeight = () => {
      setEditorHeight(Math.max(CODE_EDITOR_HEIGHT, Math.floor(shell.clientHeight)));
    };
    syncHeight();
    const observer = new ResizeObserver(syncHeight);
    observer.observe(shell);
    return () => observer.disconnect();
  }, [usesInlineMonaco]);

  const jsonParseError = i18n.translate('workflows.stepConfigPanel.validation.mustBeJson', {
    defaultMessage: 'Must be valid JSON',
  });

  const applyDraft = useCallback(
    (text: string) => {
      setDraft(text);
      if (!isJson) {
        onDraftErrorChange(undefined);
        onChange(text);
        return;
      }
      if (text.trim() === '') {
        onDraftErrorChange(undefined);
        onChange(undefined);
        return;
      }
      try {
        onChange(JSON.parse(text));
        onDraftErrorChange(undefined);
      } catch {
        // Keep the last valid value in the fragment; surface draft error for FormRow.
        onDraftErrorChange(jsonParseError);
      }
    },
    [isJson, jsonParseError, onChange, onDraftErrorChange]
  );

  // TODO(slice7): ES|QL keeps its specialized editor — no single-line collapse.
  if (usesInlineMonaco) {
    return (
      <ReferenceCapableField
        catalog={catalog}
        value={draft}
        onChange={applyDraft}
        onExpand={onExpand}
        valueFormWhenWhole={field.valueFormWhenWhole}
      >
        {({ teachingPlaceholder, appendControls, reportChange, registerSelection }) => (
          <>
            <div
              ref={shellRef}
              onBlur={onBlur}
              css={{
                position: 'relative',
                height: CODE_EDITOR_HEIGHT,
                minHeight: CODE_EDITOR_HEIGHT,
                resize: 'vertical',
                overflow: 'hidden',
                border: `${euiTheme.border.width.thin} solid ${
                  isInvalid ? euiTheme.colors.borderStrongDanger : euiTheme.colors.borderBasePlain
                }`,
                borderRadius: euiTheme.border.radius.small,
                background: euiTheme.colors.backgroundBaseSubdued,
                boxSizing: 'border-box',
                ...getReferenceChipEditorCss(euiTheme, iconMasks, colorMode),
              }}
              data-test-subj={testSubj}
              data-language={field.language}
              aria-invalid={isInvalid}
            >
              <div
                css={{
                  position: 'absolute',
                  top: euiTheme.size.m,
                  right: euiTheme.size.m,
                  zIndex: 2,
                }}
              >
                {appendControls}
              </div>
              <CodeEditor
                languageId={monacoLanguageFor(field)}
                chromeOverrides={workflowsEditorChromeOverrides}
                value={draft}
                onChange={(text, event) => {
                  const last = event?.changes?.[event.changes.length - 1];
                  const caret = last ? last.rangeOffset + last.text.length : text.length;
                  reportChange(text, caret);
                }}
                height={editorHeight}
                aria-label={field.label}
                placeholder={draft.length === 0 ? teachingPlaceholder : undefined}
                editorDidMount={(editor) => {
                  const bridge = {
                    focus: () => editor.focus(),
                    getCaret: () => {
                      const model = editor.getModel();
                      const pos = editor.getPosition();
                      if (!model || !pos) return editor.getValue().length;
                      return model.getOffsetAt(pos);
                    },
                    setCaret: (offset: number) => {
                      const model = editor.getModel();
                      if (!model) return;
                      const clamped = Math.max(0, Math.min(offset, model.getValueLength()));
                      const pos = model.getPositionAt(clamped);
                      editor.setPosition(pos);
                      editor.revealPosition(pos);
                      editor.focus();
                    },
                    replaceText: (start: number, end: number, text: string) => {
                      const model = editor.getModel();
                      if (!model) return false;
                      const startPos = model.getPositionAt(Math.max(0, start));
                      const endPos = model.getPositionAt(Math.max(0, end));
                      editor.focus();
                      editor.executeEdits('workflow-data-reference', [
                        {
                          range: {
                            startLineNumber: startPos.lineNumber,
                            startColumn: startPos.column,
                            endLineNumber: endPos.lineNumber,
                            endColumn: endPos.column,
                          },
                          text,
                          forceMoveMarkers: true,
                        },
                      ]);
                      const nextPos = model.getPositionAt(start + text.length);
                      editor.setPosition(nextPos);
                      editor.revealPosition(nextPos);
                      return true;
                    },
                  };
                  editorRef.current = bridge;
                  registerSelection(bridge);
                  setEsqlEditor((current) => current ?? editor);
                }}
                options={{
                  automaticLayout: true,
                  fontSize: 12,
                  minimap: { enabled: false },
                  lineNumbers: 'off',
                  lineNumbersMinChars: 0,
                  glyphMargin: false,
                  folding: false,
                  padding: { top: controlPaddingPx, bottom: controlPaddingPx },
                  lineDecorationsWidth: controlPaddingPx,
                  scrollBeyondLastLine: false,
                  wordWrap: 'on',
                  scrollbar: { vertical: 'auto', horizontal: 'hidden' },
                  // Typed braces are the picker's `{{` trigger: auto-closing would leave a stray `}}`.
                  ...(isJsonLiquid
                    ? {
                        autoClosingBrackets: 'never',
                        autoClosingQuotes: 'never',
                        autoSurround: 'never',
                      }
                    : {}),
                }}
              />
            </div>
            {containerWarning ? (
              <ContainerInSentenceCallout
                token={containerWarning}
                onFix={() => applyDraft(insertTokenAsJsonText(draft, containerWarning))}
                onDismiss={() =>
                  setDismissedWarnings((current) =>
                    new Set(current).add(containerWarning.expression)
                  )
                }
                testSubj={testSubj}
              />
            ) : null}
          </>
        )}
      </ReferenceCapableField>
    );
  }

  if (fixedOnly) {
    return (
      <EuiFieldText
        compressed
        fullWidth
        isInvalid={isInvalid}
        value={draft}
        onChange={(e) => applyDraft(e.target.value)}
        onBlur={onBlur}
        append={<EuiIcon type="lock" aria-hidden />}
        data-test-subj={testSubj}
        data-language={field.language}
      />
    );
  }

  return (
    <ReferenceCapableField
      catalog={catalog}
      value={draft}
      onChange={applyDraft}
      onExpand={onExpand}
      openOnBrace={field.language === 'plaintext'}
      valueFormWhenWhole={field.valueFormWhenWhole}
    >
      {(bind) => (
        <ReferenceTextInput
          bind={bind}
          catalog={catalog}
          ariaLabel={field.label}
          isInvalid={isInvalid}
          onBlur={onBlur}
          onChange={bind.reportChange}
          testSubj={testSubj}
          warnContainersInSentence={field.language === 'plaintext'}
          language={field.language}
        />
      )}
    </ReferenceCapableField>
  );
}
