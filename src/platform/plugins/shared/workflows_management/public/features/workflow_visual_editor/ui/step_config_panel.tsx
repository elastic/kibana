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
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiEmptyPrompt,
  EuiFieldNumber,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFormRow,
  EuiHorizontalRule,
  EuiIcon,
  EuiPopover,
  EuiSelect,
  EuiSwitch,
  EuiTab,
  EuiTabs,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { isMap, parseDocument, stringify as stringifyYaml } from 'yaml';
import { CodeEditor } from '@kbn/code-editor';
import { i18n } from '@kbn/i18n';
import { ESQL_LANG_ID, XJSON_LANG_ID, YAML_LANG_ID } from '@kbn/monaco';
import type { ConnectorContractUnion, WorkflowYaml } from '@kbn/workflows';
import { getBuiltInStepDefinition } from '@kbn/workflows';
import { ensureWorkflowGraphEuiIcons, resolveNodeChipStyle, stepSupportsErrorHandling, WORKFLOWS_MONACO_EDITOR_THEME } from '@kbn/workflows-ui';
import { StepIcon } from '../../../shared/ui/step_icons/step_icon';
import { resolveCatalogDisplayName } from '../../../shared/utils/catalog_display_name';
import { buildDataReferenceCatalog } from '../lib/build_data_reference_catalog';
import {
  fieldLabelDivergesFromKey,
  getStepFormSchema,
  isEmptyFieldValue,
  isFieldValueRepresentable,
  validateStepField,
  type StepFormField,
} from '../lib/step_form_schema';
import { FieldEditorSubFlyout } from './field_editor_sub_flyout';
import {
  FlyoutMonacoFrame,
  getFlyoutMonacoEditorOptions,
} from './flyout_monaco_frame';
import { ReferenceCapableField } from './reference_capable_field';
import { StepErrorHandlingSection } from './step_error_handling_section';
import { WORKFLOW_STEP_CONFIG_FLYOUT_HISTORY_KEY } from './workflow_step_config_flyout_history_key';

ensureWorkflowGraphEuiIcons();

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
  readonly onCancel: () => void;
  readonly onSave: (fragment: string) => void;
  /**
   * True when this panel configures an `on-failure.fallback` step — hides the
   * Error handling section (mirrors canvas error-port eligibility).
   */
  readonly isFallbackStep?: boolean;
  /** Flyout width in px (supports resize via `onResize`). */
  readonly size?: number;
  readonly minWidth?: number;
  readonly maxWidth?: number;
  readonly onResize?: (width: number) => void;
}

const DEFAULT_FLYOUT_SIZE = 560;
const DEFAULT_FLYOUT_MIN_WIDTH = 420;

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

const CODE_EDITOR_HEIGHT = 160;

/** Flatten newlines / runs of whitespace for single-line Inputs display only. */
const collapseWhitespaceForDisplay = (text: string): string => text.replace(/\s+/g, ' ');

/** Monaco language for a code field. There is no KQL Monaco mode, so conditions use plaintext. */
const monacoLanguageFor = (field: StepFormField): string => {
  switch (field.language) {
    case 'json':
      return XJSON_LANG_ID;
    case 'esql':
      return ESQL_LANG_ID;
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
  if (isEmptyFieldValue(value) && !field.required) {
    doc.deleteIn(field.path as string[]);
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
  stepType,
  actionLabel,
  initialFragment,
  connectors,
  workflowDefinition,
  onCancel,
  onSave,
  isFallbackStep = false,
  size = DEFAULT_FLYOUT_SIZE,
  minWidth = DEFAULT_FLYOUT_MIN_WIDTH,
  maxWidth,
  onResize,
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
  const flyoutId = useGeneratedHtmlId({ prefix: 'workflowStepConfigFlyout' });
  const settingsAccordionId = useGeneratedHtmlId({ prefix: 'workflowStepConfigSettings' });
  const [settingsOpen, setSettingsOpen] = useState(settingsAccordionOpenForPage);
  /** Field currently open in the expanded editor child flyout (depth ≤ 2). */
  const [expandedField, setExpandedField] = useState<StepFormField | null>(null);

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
      }),
    [workflowDefinition, currentStepName, connectors]
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
      expandedField.language === 'json' &&
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

  const hasFormErrors = useMemo(() => {
    if (draftErrors.size > 0) return true;
    if (isEmptyFieldValue(committedStepName)) return true;
    return fields.some((field) => {
      const value = toJs(readFragmentValue(fragment, field.path));
      if (!isFieldValueRepresentable(field, value)) return false;
      return validateStepField(field, value) !== undefined;
    });
  }, [fields, fragment, draftErrors, committedStepName]);

  const closeLabel = i18n.translate('workflows.stepConfigPanel.close', {
    defaultMessage: 'Close',
  });
  const stepNameLabel = i18n.translate('workflows.stepConfigPanel.stepName', {
    defaultMessage: 'Step name',
  });
  const editNameLabel = i18n.translate('workflows.stepConfigPanel.editStepName', {
    defaultMessage: 'Edit step name',
  });

  const handleSave = useCallback(() => {
    if (!parsed.valid || hasFormErrors) {
      setShowValidation(true);
      return;
    }
    onSave(fragment);
  }, [parsed.valid, hasFormErrors, onSave, fragment]);

  // Flyout Escape / mask close — skip while the step-name editor is active
  // (Escape there reverts the name via the input handler instead).
  const handleClose = useCallback(() => {
    if (isEditingNameRef.current) return;
    onCancel();
  }, [onCancel]);

  const showSettings = !isFallbackStep && stepSupportsErrorHandling(stepType);

  const editorModeOptions: Array<{
    id: ParametersMode;
    iconType: string;
    label: string;
  }> = [
    {
      id: 'form',
      iconType: 'workflow',
      label: i18n.translate('workflows.stepConfigPanel.builderTab', {
        defaultMessage: 'Visual builder',
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
    <>
    <EuiFlyout
      // Keep the canvas interactive while this is open: no overlay mask, and
      // outside clicks must not dismiss. Closing is driven by selection
      // (pane click deselects → parent clears the panel) or Cancel / Escape.
      id={flyoutId}
      session="start"
      historyKey={WORKFLOW_STEP_CONFIG_FLYOUT_HISTORY_KEY}
      flyoutMenuProps={{ title: headerTitle }}
      ownFocus={false}
      outsideClickCloses={false}
      hideCloseButton
      paddingSize="none"
      size={size}
      minWidth={minWidth}
      maxWidth={maxWidth}
      resizable={Boolean(onResize)}
      onResize={onResize}
      onClose={handleClose}
      aria-labelledby={titleId}
      data-test-subj="workflowStepConfigPanel"
    >
      <EuiFlyoutHeader
        hasBorder
        css={{
          // Keep Visual builder / YAML tabs flush on the header border.
          '&&': { paddingBottom: 0 },
        }}
      >
        <div
          css={{
            display: 'flex',
            alignItems: 'center',
            gap: euiTheme.size.m,
            // paddingSize="none" on the flyout clears header inset — restore
            // 16px (size.base) so the step tile and close aren't edge-flush.
            padding: `${euiTheme.size.base} ${euiTheme.size.base} ${euiTheme.size.s}`,
          }}
        >
          {/*
            Single-line header: icon · name · pencil · close. No catalog/type
            subtitle — the user already picked this node, the chip carries the
            provider, and the form fields / YAML view identify the step kind.
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
                  chip.iconColor
                    ? { '& svg, & svg *': { fill: chip.iconColor } }
                    : undefined,
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
            </div>
          </div>
          <div
            css={{
              display: 'flex',
              alignItems: 'center',
              gap: euiTheme.size.s,
              flex: '0 0 auto',
            }}
          >
            <EuiToolTip content={closeLabel} disableScreenReaderOutput>
              <EuiButtonIcon
                iconType="cross"
                color="text"
                aria-label={closeLabel}
                onClick={onCancel}
                data-test-subj="workflowStepConfigPanelClose"
                css={{ flex: '0 0 auto' }}
              />
            </EuiToolTip>
          </div>
        </div>
        <EuiTabs
          size="s"
          bottomBorder={false}
          data-test-subj="workflowStepConfigPanelTabs"
          aria-label={i18n.translate('workflows.stepConfigPanel.editorModeLegend', {
            defaultMessage: 'Step editor mode',
          })}
          css={{ paddingInline: euiTheme.size.base }}
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
      </EuiFlyoutHeader>

      <EuiFlyoutBody
        css={{
          // Own scroll / fill layout so YAML monaco can take remaining height.
          '.euiFlyoutBody__overflow': {
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          },
          '.euiFlyoutBody__overflowContent': {
            flex: '1 1 auto',
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            padding: 0,
          },
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
                value={fragment}
                onChange={setFragment}
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
                    {showSettings ? (
                      <div data-test-subj="workflowStepConfigErrorHandlingSection">
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
      </EuiFlyoutBody>

      <EuiFlyoutFooter
        css={{
          // paddingSize="none" zeroes `.euiFlyoutFooter` via the parent flyout
          // selector — pad an inner wrapper so we don't fight that cascade.
          padding: 0,
        }}
      >
        <div
          css={{
            // Match EUI paddingSize="m" footer: 12px block / 16px inline → use 16px all around.
            paddingBlock: euiTheme.size.base,
            paddingInline: euiTheme.size.base,
          }}
        >
          <EuiFlexGroup justifyContent="flexEnd" gutterSize="m" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                onClick={onCancel}
                data-test-subj="workflowStepConfigPanelCancel"
              >
                {i18n.translate('workflows.stepConfigPanel.cancel', { defaultMessage: 'Cancel' })}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                onClick={handleSave}
                isDisabled={!parsed.valid || hasFormErrors}
                data-test-subj="workflowStepConfigPanelSave"
              >
                {i18n.translate('workflows.stepConfigPanel.save', { defaultMessage: 'Save step' })}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
      </EuiFlyoutFooter>
    </EuiFlyout>

      {expandedField ? (
        <FieldEditorSubFlyout
          fieldLabel={expandedField.label}
          value={expandedFieldValue}
          onChange={handleExpandedFieldChange}
          catalog={referenceCatalog}
          language={
            expandedField.kind === 'code' ? expandedField.language : undefined
          }
          onBack={handleFieldEditorBack}
          onCloseStack={onCancel}
        />
      ) : null}
    </>
  );
}

function StepForm({
  fields,
  hasSchema,
  fragment,
  showValidation,
  referenceCatalog,
  onChange,
  onDraftErrorChange,
  onExpandField,
}: {
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

  const renderField = (field: StepFormField, options: { removable: boolean }) => (
    <StepFieldRow
      key={fieldId(field)}
      field={field}
      value={toJs(readFragmentValue(fragment, field.path))}
      showValidation={showValidation}
      referenceCatalog={referenceCatalog}
      showOptionalMarker={!field.required}
      onRemove={options.removable ? () => removeOptionalField(field) : undefined}
      onChange={(value) => onChange(field, value)}
      onDraftErrorChange={(error) => onDraftErrorChange(fieldId(field), error)}
      onExpand={() => onExpandField(field)}
    />
  );

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
      <div
        data-test-subj="workflowStepConfigPanelForm"
        css={{ paddingTop: 12 }}
      >
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

/**
 * EuiFormRow wrapper that forbids invalid-without-error — color is never the
 * only signal. When `isInvalid`, `error` is required.
 */
function StepValidatedFormRow({
  isInvalid,
  error,
  helpText,
  children,
  ...rest
}: React.ComponentProps<typeof EuiFormRow>) {
  if (isInvalid && (error === undefined || error === null || error === '')) {
    throw new Error('StepValidatedFormRow: isInvalid requires a visible error message');
  }
  return (
    <EuiFormRow
      {...rest}
      isInvalid={isInvalid}
      error={isInvalid ? error : undefined}
      helpText={isInvalid ? undefined : helpText}
    >
      {children}
    </EuiFormRow>
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
}) {
  const { euiTheme } = useEuiTheme();
  const switchId = useGeneratedHtmlId({ prefix: `workflowStepConfigSwitch-${fieldId(field)}` });
  const [accused, setAccused] = useState(false);
  const [jsonDraftError, setJsonDraftError] = useState<string | undefined>();

  useEffect(() => {
    if (showValidation) setAccused(true);
  }, [showValidation]);

  const onDraftErrorChangeRef = useRef(onDraftErrorChange);
  onDraftErrorChangeRef.current = onDraftErrorChange;
  // Clear parent draft-error slot only when this row unmounts — not when the
  // parent re-creates the callback identity on every render.
  useEffect(() => () => onDraftErrorChangeRef.current(undefined), []);

  const setDraftError = useCallback(
    (error: string | undefined) => {
      setJsonDraftError(error);
      onDraftErrorChangeRef.current(error);
    },
    []
  );

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
    const nextError = jsonDraftError ?? (representable ? validateStepField(field, value) : undefined);
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

  const labelAppend =
    showOptionalMarker || onRemove ? (
      <span
        css={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          // Expand ✕ to the right of Optional on row hover / own focus.
          '.workflowStepConfigFieldRow:hover &, &:focus-within': {
            '[data-remove-field]': removeExpandedCss,
          },
        }}
      >
        {showOptionalMarker ? (
          <EuiText size="xs" color="subdued">
            {optionalLabel}
          </EuiText>
        ) : null}
        {onRemove ? (
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
        ) : null}
      </span>
    ) : undefined;

  const helpText = representable
    ? field.description
    : i18n.translate('workflows.stepConfigPanel.definedInYaml', {
        defaultMessage: 'Defined in YAML',
      });

  const testSubj = `workflowStepConfigField-${field.path.join('.')}`;

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
    // Compact: label + switch on one line (8px gap), Optional right-aligned; help 4px below.
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
              aria-describedby={helpText ? `${switchId}-help` : undefined}
              data-test-subj={testSubj}
            />
          </div>
          {labelAppend}
        </div>
        {helpText ? (
          <EuiText size="xs" color="subdued" id={`${switchId}-help`}>
            {helpText}
          </EuiText>
        ) : null}
      </div>
    );
  }

  const rowProps = {
    label: labelContent,
    labelAppend,
    helpText,
    isInvalid,
    error: errorMessage,
    fullWidth: true,
    display: 'row' as const,
  };

  const wrapRow = (child: React.ReactElement) => (
    <div className="workflowStepConfigFieldRow">{child}</div>
  );

  switch (field.kind) {
    case 'number':
      return wrapRow(
        <StepValidatedFormRow {...rowProps}>
          <EuiFieldNumber
            compressed
            fullWidth
            isInvalid={isInvalid}
            value={typeof value === 'number' || typeof value === 'string' ? value : ''}
            onChange={(e) =>
              onChange(e.target.value === '' ? undefined : Number(e.target.value))
            }
            onBlur={accuseIfInvalid}
            data-test-subj={testSubj}
          />
        </StepValidatedFormRow>
      );
    case 'select':
      return wrapRow(
        <StepValidatedFormRow {...rowProps}>
          <EuiSelect
            compressed
            fullWidth
            isInvalid={isInvalid}
            hasNoInitialSelection={value === undefined}
            options={(field.options ?? []).map((o) => ({ value: o, text: o }))}
            value={value === undefined ? '' : String(value)}
            onChange={(e) => onChange(e.target.value)}
            onBlur={accuseIfInvalid}
            data-test-subj={testSubj}
          />
        </StepValidatedFormRow>
      );
    case 'code':
      return wrapRow(
        <StepValidatedFormRow {...rowProps}>
          <CodeField
            field={field}
            value={value}
            catalog={referenceCatalog}
            onChange={onChange}
            testSubj={testSubj}
            isInvalid={isInvalid}
            onBlur={accuseIfInvalid}
            onDraftErrorChange={setDraftError}
            // TODO(slice7): ES|QL keeps its specialized editor — no expand here.
            onExpand={field.language === 'esql' ? undefined : onExpand}
          />
        </StepValidatedFormRow>
      );
    case 'text':
    default:
      return wrapRow(
        <StepValidatedFormRow {...rowProps}>
          <ReferenceCapableField
            catalog={referenceCatalog}
            value={value === undefined || value === null ? '' : String(value)}
            onChange={onChange}
            onExpand={onExpand}
          >
            {({
              value: textValue,
              teachingPlaceholder,
              appendControls,
              reportChange,
              attachInputRef,
              isOpen,
            }) => (
              <EuiFieldText
                compressed
                fullWidth
                isInvalid={isInvalid}
                value={textValue}
                placeholder={textValue.length === 0 ? teachingPlaceholder : undefined}
                inputRef={attachInputRef}
                onChange={(e) => {
                  const next = e.target.value;
                  const caret = e.target.selectionStart ?? next.length;
                  reportChange(next, caret);
                }}
                onBlur={accuseIfInvalid}
                append={appendControls}
                data-test-subj={testSubj}
                aria-expanded={isOpen}
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
}) {
  const { euiTheme } = useEuiTheme();
  const isJson = field.language === 'json';
  const isEsql = field.language === 'esql';
  const controlPaddingPx = parseInt(String(euiTheme.size.m), 10);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<{
    focus: () => void;
    getCaret: () => number;
    setCaret: (offset: number) => void;
  } | null>(null);
  const [editorHeight, setEditorHeight] = useState(CODE_EDITOR_HEIGHT);

  const external = useMemo(() => {
    if (value === undefined || value === null) return '';
    if (isJson && typeof value !== 'string') return JSON.stringify(value, null, 2);
    return String(value);
  }, [value, isJson]);

  // Inline Inputs show a whitespace-collapsed string; the document keeps the
  // original until the user edits (or expands and edits in the sub-flyout).
  const [draft, setDraft] = useState(() =>
    isEsql ? external : collapseWhitespaceForDisplay(external)
  );

  useEffect(() => {
    setDraft(isEsql ? external : collapseWhitespaceForDisplay(external));
    onDraftErrorChange(undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onDraftErrorChange is intentionally omitted
  }, [external, isEsql]);

  useEffect(() => {
    if (!isEsql) return;
    const shell = shellRef.current;
    if (!shell || typeof ResizeObserver === 'undefined') return;
    const syncHeight = () => {
      setEditorHeight(Math.max(CODE_EDITOR_HEIGHT, Math.floor(shell.clientHeight)));
    };
    syncHeight();
    const observer = new ResizeObserver(syncHeight);
    observer.observe(shell);
    return () => observer.disconnect();
  }, [isEsql]);

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
  if (isEsql) {
    return (
      <ReferenceCapableField
        catalog={catalog}
        value={draft}
        onChange={applyDraft}
        onExpand={onExpand}
      >
        {({ teachingPlaceholder, appendControls, reportChange, registerSelection }) => (
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
              value={draft}
              onChange={(text, event) => {
                const last = event?.changes?.[event.changes.length - 1];
                const caret = last
                  ? last.rangeOffset + last.text.length
                  : text.length;
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
              }}
              options={{
                theme: WORKFLOWS_MONACO_EDITOR_THEME,
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
              }}
            />
          </div>
        )}
      </ReferenceCapableField>
    );
  }

  return (
    <ReferenceCapableField
      catalog={catalog}
      value={draft}
      onChange={applyDraft}
      onExpand={onExpand}
    >
      {({
        teachingPlaceholder,
        appendControls,
        reportChange,
        attachInputRef,
        isOpen,
      }) => (
        <EuiFieldText
          compressed
          fullWidth
          isInvalid={isInvalid}
          value={draft}
          placeholder={draft.length === 0 ? teachingPlaceholder : undefined}
          inputRef={attachInputRef}
          onChange={(e) => {
            const next = e.target.value;
            const caret = e.target.selectionStart ?? next.length;
            reportChange(next, caret);
          }}
          onBlur={onBlur}
          append={appendControls}
          data-test-subj={testSubj}
          data-language={field.language}
          aria-expanded={isOpen}
          css={{
            // Ellipsis when collapsed JSON / multi-line values overflow the row.
            '.euiFieldText': {
              textOverflow: 'ellipsis',
            },
          }}
        />
      )}
    </ReferenceCapableField>
  );
}

