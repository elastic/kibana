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
  EuiConfirmModal,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiTab,
  EuiTabs,
  EuiText,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { isEqual } from 'lodash';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CodeEditor } from '@kbn/code-editor';
import { i18n } from '@kbn/i18n';
import { YAML_LANG_ID } from '@kbn/monaco';
import type { monaco } from '@kbn/monaco';
import type { ConnectorContractUnion, WorkflowYaml } from '@kbn/workflows';
import { getBuiltInStepDefinition, LoopStepTypes } from '@kbn/workflows';
import {
  ensureWorkflowGraphEuiIcons,
  stepSupportsErrorHandlingSettings,
  workflowsEditorChromeOverrides,
} from '@kbn/workflows-ui';
import { detectIndent, isReferenceValue } from '@kbn/workflows-yaml';
import type { DataReferenceRunControls } from './data_reference_catalog_tree';
import { FieldEditorSubFlyout } from './field_editor_sub_flyout';
import { FlyoutMonacoFrame, getFlyoutMonacoEditorOptions } from './flyout_monaco_frame';
import { StepConfigHeader } from './step_config_header';
import { StepErrorHandlingSection } from './step_error_handling_section';
import { StepFieldRow } from './step_field_row';
import { StepForm } from './step_form';
import { StepFormReadOnlyContext } from './step_form_read_only_context';
import { useStepFragment } from './use_step_fragment';
import { useStepNameEditor } from './use_step_name_editor';
import { resolveCatalogDisplayName } from '../../../shared/utils/catalog_display_name';
import type { StepScopeSchemas } from '../lib/build_data_reference_catalog';
import { buildDataReferenceCatalog } from '../lib/build_data_reference_catalog';
import { collectStepNames } from '../lib/collect_step_names';
import { writeFragmentValue } from '../lib/fragment_yaml';
import { isInParallelBody } from '../lib/is_in_parallel_body';
import { asJsonField, isTagValue } from '../lib/list_value';
import { isStepFragmentDirty } from '../lib/parse_step_fragment';
import {
  fieldId,
  getStepFormSchema,
  isEmptyFieldValue,
  type StepFormField,
} from '../lib/step_form_schema';

ensureWorkflowGraphEuiIcons();

/** True when `draft` is JSON for `value`; an empty draft, `null`, `[]` and `{}` all stand for no value. */
const isJsonDraftOf = (draft: string, value: unknown): boolean => {
  try {
    const drafted: unknown = draft.trim() === '' ? undefined : JSON.parse(draft);
    return isEqual(drafted, value) || (isEmptyFieldValue(drafted) && isEmptyFieldValue(value));
  } catch {
    return false;
  }
};

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
   * The name the step has in the workflow now. A draft that gives it another step's name is never
   * written, so the panel asks before closing on one.
   */
  readonly stepName?: string;
  /**
   * Catalog display name from the Actions menu (e.g. "HTTP Request"). Used for
   * the subtitle (and as the title fallback when the step has no name yet).
   */
  readonly actionLabel?: string;
  /** Step YAML fragment (a mapping) the panel starts from. */
  readonly initialFragment: string;
  /**
   * The step as the YAML now has it after a change from outside the panel (an undo, an edit in
   * the YAML tab). It replaces the draft; unlike a new `initialFragment` it does not reset the
   * rest of the form. Pass a new object for every change, even one that repeats an earlier fragment.
   */
  readonly syncedFragment?: { readonly fragment: string };
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
  /**
   * Shows the step without letting the user change it: inert form and Advanced settings, a
   * read-only YAML tab, a plain name, and no Remove / Reset. `onFragmentChange` never fires.
   */
  readonly readOnly?: boolean;
  /** Read-only footer action: run just this step. Omitted when the user cannot run it. */
  readonly onRunStep?: () => void;
  /** Read-only footer action: show this step in the workflow's YAML. */
  readonly onOpenInYaml?: () => void;
}

/** The step's name, edited in the header and written as any other form key. */
const STEP_NAME_FIELD: StepFormField = {
  key: 'name',
  path: ['name'],
  label: 'Step name',
  required: true,
  kind: 'text',
};

/** Keeps a `<fieldset>` (used to disable its controls) from drawing a border or resizing. */
const FIELDSET_RESET_CSS = { border: 0, margin: 0, padding: 0, minWidth: 0 } as const;

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

/** For a row whose field has no sub-fields (only a `variants` field renders any). */
const renderNoSubFields = (): React.ReactElement => <></>;

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
  stepType: openedStepType,
  stepName,
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
  syncedFragment,
  readOnly = false,
  onRunStep,
  onOpenInYaml,
}: StepConfigPanelProps) {
  const { euiTheme } = useEuiTheme();
  const [parametersMode, setParametersMode] = useState<ParametersMode>('form');
  // The fragment is the single source of truth for Form and YAML.
  const [fragment, setFragment] = useState(initialFragment);
  const [showValidation, setShowValidation] = useState(false);
  const indent = useMemo(() => detectIndent(initialFragment), [initialFragment]);
  const titleId = useGeneratedHtmlId({ prefix: 'workflowStepConfigTitle' });
  const typeSubtitleId = useGeneratedHtmlId({ prefix: 'workflowStepConfigTypeSubtitle' });
  const settingsAccordionId = useGeneratedHtmlId({ prefix: 'workflowStepConfigSettings' });
  // The fragment is parsed once here; every read below goes through it.
  const parsed = useStepFragment(fragment);
  const initialParsed = useStepFragment(initialFragment);
  // The type the YAML says: the YAML tab or an undo can change it under the panel, and the form,
  // icon and settings follow it.
  const typeInYaml = parsed.read(['type']);
  const stepType =
    typeof typeInYaml === 'string' && typeInYaml !== '' ? typeInYaml : openedStepType;

  const siblingStepNames = useMemo(
    () => collectStepNames(workflowDefinition?.steps),
    [workflowDefinition]
  );

  const committedStepName = typeof parsed.js?.name === 'string' ? parsed.js.name.trim() : '';
  const nameEditor = useStepNameEditor({
    committedName: committedStepName,
    siblingStepNames,
    onCommit: useCallback(
      (name: string) =>
        setFragment((current) => writeFragmentValue(current, STEP_NAME_FIELD, name, indent)),
      [indent]
    ),
  });
  const { reset: resetNameEditor, revert: revertNameEditor, error: nameError } = nameEditor;

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
    if (readOnly) return;
    onFragmentChange?.(fragment);
  }, [fragment, onFragmentChange, readOnly]);

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
    resetNameEditor();
    setExpandedField(null);
    setShowDiscardConfirm(false);
  }, [initialFragment, resetNameEditor]);

  useEffect(() => {
    if (syncedFragment) setFragment(syncedFragment.fragment);
  }, [syncedFragment]);

  const schema = useMemo(() => getStepFormSchema(stepType, connectors), [stepType, connectors]);
  // Name is edited in the header only — never as a form body field.
  const fields = useMemo(() => schema?.fields ?? [], [schema]);

  const currentStepName = useMemo(() => {
    const name = parsed.read(['name']);
    return typeof name === 'string' ? name : '';
  }, [parsed]);

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

  const handleFieldChange = useCallback(
    (field: StepFormField, value: unknown) =>
      setFragment((current) => writeFragmentValue(current, field, value, indent)),
    [indent]
  );

  // The JSON the user last typed in the expanded editor. The step holds the value it parses to, which
  // reads back re-formatted; the editor keeps the typed text for as long as it says that value.
  const typedExpandedJsonRef = useRef<string | undefined>(undefined);

  const expandedFieldValue = useMemo(() => {
    if (!expandedField) return '';
    const raw = parsed.read(expandedField.path);
    const typed = typedExpandedJsonRef.current;
    if (typed !== undefined && isJsonDraftOf(typed, raw)) return typed;
    if (raw === undefined || raw === null) return '';
    // Like the Data box, which hides a typed value kept while the switch sits on Data.
    if (
      (expandedField.kind === 'boolean' || expandedField.kind === 'number') &&
      !isReferenceValue(raw)
    ) {
      return '';
    }
    if (
      expandedField.kind === 'code' &&
      (expandedField.language === 'json' || expandedField.language === 'json-liquid') &&
      typeof raw !== 'string'
    ) {
      return JSON.stringify(raw, null, 2);
    }
    return String(raw);
  }, [expandedField, parsed]);

  const handleExpandedFieldChange = useCallback(
    (next: string) => {
      if (!expandedField) return;
      if (expandedField.kind === 'boolean' || expandedField.kind === 'number') {
        // Only the Data side expands these: the editor holds one whole reference. A typed or
        // half-written draft is not a value for them, so the last valid one is kept.
        if (next.trim() === '') handleFieldChange(expandedField, undefined);
        else if (isReferenceValue(next)) handleFieldChange(expandedField, next);
        return;
      }
      if (expandedField.kind === 'code' && expandedField.language === 'json') {
        typedExpandedJsonRef.current = next;
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

  const handleExpandField = useCallback(
    (field: StepFormField) => {
      typedExpandedJsonRef.current = undefined;
      // A list that is not tags is a JSON editor in its row, so it is one when expanded too.
      const isJsonList = field.kind === 'list' && !isTagValue(parsed.read(field.path));
      setExpandedField(isJsonList ? asJsonField(field) : field);
    },
    [parsed]
  );

  const handleFieldEditorBack = useCallback(() => {
    setExpandedField(null);
  }, []);

  const catalogLabel = useMemo(
    () => resolveCatalogLabel(stepType, connectors, actionLabel),
    [stepType, connectors, actionLabel]
  );

  // Instance name matches the canvas node; empty / insert-before-name falls back to catalog.
  const headerTitle = nameEditor.displayName || catalogLabel;

  // The stateful shell live-applies every valid draft straight to the YAML;
  // a draft with blocking errors (empty name, unparseable mid-edit value, or
  // invalid YAML) is never written. Block only those — not advisory field
  // validation, which can still be applied.
  const nameTaken =
    stepName !== undefined &&
    committedStepName !== stepName &&
    siblingStepNames.has(committedStepName);
  const hasBlockingDraftErrors = useMemo(() => {
    if (draftErrors.size > 0 || nameTaken) return true;
    return isEmptyFieldValue(committedStepName);
  }, [draftErrors, nameTaken, committedStepName]);

  const canApplyDraft = parsed.valid && !hasBlockingDraftErrors;
  const isDirty = useMemo(
    () => isStepFragmentDirty(parsed, initialParsed),
    [parsed, initialParsed]
  );

  // ✕ / Escape share one close-attempt path: an un-appliable draft (the YAML
  // the stateful shell never wrote) prompts before discarding it; otherwise
  // the flyout just closes — everything else is already live in the YAML.
  // Skipped while the step-name editor is active (Escape there reverts the
  // name instead).
  const attemptClose = useCallback(() => {
    if (nameEditor.isEditingRef.current) {
      // A refused name (empty, taken) was never written, so closing loses nothing: drop the edit.
      if (!nameError) return;
      revertNameEditor();
    }
    if (!canApplyDraft) {
      setShowValidation(true);
      setShowDiscardConfirm(true);
      return;
    }
    onClose();
  }, [canApplyDraft, onClose, nameEditor.isEditingRef, nameError, revertNameEditor]);

  const handleKeepEditing = useCallback(() => {
    setShowDiscardConfirm(false);
  }, []);

  const handleDiscardInvalidDraft = useCallback(() => {
    setShowDiscardConfirm(false);
    onClose();
  }, [onClose]);

  const showSettings = !isFallbackStep && stepSupportsErrorHandlingSettings(stepType);
  // The engine rejects a step-level `if` / `timeout` on a step directly inside a parallel branch.
  const inParallelBody = useMemo(
    () => isInParallelBody(workflowDefinition?.steps, currentStepName),
    [workflowDefinition, currentStepName]
  );
  const stepCondition = inParallelBody ? undefined : schema?.condition;
  const stepTimeout = inParallelBody ? undefined : schema?.timeout;

  const renderStepSetting = (testSubj: string, title: string, field: StepFormField) => (
    <div data-test-subj={testSubj} css={{ marginBlockEnd: euiTheme.size.l }}>
      <EuiTitle size="xxs" css={{ marginBlockEnd: euiTheme.size.s }}>
        <h5>{title}</h5>
      </EuiTitle>
      <StepFieldRow
        field={field}
        value={parsed.read(field.path)}
        showValidation={showValidation}
        referenceCatalog={referenceCatalog}
        showOptionalMarker={false}
        onChange={(value) => handleFieldChange(field, value)}
        onDraftErrorChange={(error) => handleDraftErrorChange(fieldId(field), error)}
        onExpand={() => handleExpandField(field)}
        renderSubField={renderNoSubFields}
      />
    </div>
  );

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

  return (
    <StepFormReadOnlyContext.Provider value={readOnly}>
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
        <StepConfigHeader
          stepType={stepType}
          headerTitle={headerTitle}
          titleId={titleId}
          typeSubtitleId={typeSubtitleId}
          nameEditor={nameEditor}
          onClose={attemptClose}
          readOnly={readOnly}
        >
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
        </StepConfigHeader>

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
                  options={{
                    ...getFlyoutMonacoEditorOptions(euiTheme, { tabSize: indent }),
                    readOnly,
                  }}
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
                    // A disabled fieldset makes every native control inside inert when read-only;
                    // the context covers the fields that are not (see `StepFormReadOnlyContext`).
                    <fieldset disabled={readOnly} css={FIELDSET_RESET_CSS}>
                      <StepForm
                        key={initialFragment}
                        stepType={stepType}
                        fields={fields}
                        hasSchema={schema !== undefined}
                        step={parsed}
                        showValidation={showValidation}
                        referenceCatalog={referenceCatalog}
                        onChange={handleFieldChange}
                        onDraftErrorChange={handleDraftErrorChange}
                        onExpandField={handleExpandField}
                        readOnly={readOnly}
                      />
                    </fieldset>
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

                  {parsed.valid ? (
                    <>
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
                        <fieldset
                          disabled={readOnly}
                          data-test-subj="workflowStepConfigPanelSettings"
                          css={[FIELDSET_RESET_CSS, { paddingTop: euiTheme.size.m }]}
                        >
                          {stepCondition
                            ? renderStepSetting(
                                'workflowStepConfigConditionSection',
                                i18n.translate('workflows.stepConfigPanel.conditionTitle', {
                                  defaultMessage: 'Conditional execution',
                                }),
                                stepCondition
                              )
                            : null}
                          {stepTimeout
                            ? renderStepSetting(
                                'workflowStepConfigTimeoutSection',
                                i18n.translate('workflows.stepConfigPanel.timeoutTitle', {
                                  defaultMessage: 'Timeout',
                                }),
                                stepTimeout
                              )
                            : null}
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
                                onFailureValue={parsed.read(['on-failure'])}
                                indent={indent}
                                onFragmentChange={setFragment}
                                isLoop={LoopStepTypes.some((type) => type === stepType)}
                              />
                            </div>
                          ) : (
                            <EuiText size="s" color="subdued">
                              {i18n.translate('workflows.stepConfigPanel.settingsUnavailable', {
                                defaultMessage: 'Error handling is not available for this step.',
                              })}
                            </EuiText>
                          )}
                        </fieldset>
                      </EuiAccordion>
                    </>
                  ) : null}
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
            {readOnly ? (
              <>
                {onOpenInYaml ? (
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty
                      iconType="code"
                      onClick={onOpenInYaml}
                      data-test-subj="workflowStepConfigPanelOpenInYaml"
                    >
                      {i18n.translate('workflows.stepConfigPanel.openInYaml', {
                        defaultMessage: 'Open in YAML',
                      })}
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                ) : null}
                {onRunStep ? (
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      fill
                      iconType="play"
                      onClick={onRunStep}
                      data-test-subj="workflowStepConfigPanelRunStep"
                    >
                      {i18n.translate('workflows.stepConfigPanel.runStep', {
                        defaultMessage: 'Run step',
                      })}
                    </EuiButton>
                  </EuiFlexItem>
                ) : null}
              </>
            ) : (
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
                    isDisabled={!isDirty}
                    data-test-subj="workflowStepConfigPanelResetNode"
                  >
                    {i18n.translate('workflows.stepConfigPanel.resetNode', {
                      defaultMessage: 'Reset node',
                    })}
                  </EuiButtonEmpty>
                )}
              </EuiFlexItem>
            )}
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
              // Numbers and yes/no keep their type, so a whole pick is written as a value.
              valueFormWhenWhole={
                expandedField.valueFormWhenWhole === true ||
                expandedField.kind === 'boolean' ||
                expandedField.kind === 'number'
              }
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
    </StepFormReadOnlyContext.Provider>
  );
}
