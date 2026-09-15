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
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFieldNumber,
  EuiFieldText,
  EuiFormRow,
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
import { XJSON_LANG_ID, YAML_LANG_ID } from '@kbn/monaco';
import type { ConnectorContractUnion, WorkflowYaml } from '@kbn/workflows';
import { getBuiltInStepDefinition } from '@kbn/workflows';
import { ensureWorkflowGraphEuiIcons, stepSupportsErrorHandling, WORKFLOWS_MONACO_EDITOR_THEME } from '@kbn/workflows-ui';
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
import { ReferenceCapableField } from './reference_capable_field';
import {
  ErrorHandlingConfiguredBadge,
  hasOnFailureConfigured,
  StepErrorHandlingSection,
} from './step_error_handling_section';

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
  /** Momentarily reveal/pulse this step's error port on the canvas. */
  readonly onRevealErrorPort?: () => void;
  /** Select/center a fallback step on the canvas (read-only discovery). */
  readonly onViewFallbackOnCanvas?: (stepName: string) => void;
}

type PanelView = 'form' | 'yaml';

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

/** Monaco language for a code field. There is no KQL Monaco mode, so conditions use plaintext. */
const monacoLanguageFor = (field: StepFormField): string => {
  switch (field.language) {
    case 'json':
      return XJSON_LANG_ID;
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

export function StepConfigPanel({
  stepType,
  actionLabel,
  initialFragment,
  connectors,
  workflowDefinition,
  onCancel,
  onSave,
  isFallbackStep = false,
  onRevealErrorPort,
  onViewFallbackOnCanvas,
}: StepConfigPanelProps) {
  const { euiTheme } = useEuiTheme();
  const [view, setView] = useState<PanelView>('form');
  // The fragment is the single source of truth for both views.
  const [fragment, setFragment] = useState(initialFragment);
  const [showValidation, setShowValidation] = useState(false);
  const indent = useMemo(() => detectIndent(initialFragment), [initialFragment]);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [nameError, setNameError] = useState<string | undefined>();
  const nameEditBaselineRef = useRef('');
  const isEditingNameRef = useRef(false);

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
  }, [initialFragment]);

  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  // Escape anywhere inside the panel cancels — unless the step-name editor is
  // active (Escape reverts the name instead).
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (isEditingName) return;
      event.stopPropagation();
      onCancel();
    };
    panel.addEventListener('keydown', onKeyDown);
    return () => panel.removeEventListener('keydown', onKeyDown);
  }, [onCancel, isEditingName]);

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

  const viewOptions = [
    {
      id: 'form',
      label: i18n.translate('workflows.stepConfigPanel.formView', { defaultMessage: 'Form' }),
    },
    {
      id: 'yaml',
      label: i18n.translate('workflows.stepConfigPanel.yamlView', { defaultMessage: 'YAML' }),
    },
  ];

  return (
    <div
      ref={panelRef}
      tabIndex={-1}
      role="dialog"
      aria-label={headerTitle}
      data-test-subj="workflowStepConfigPanel"
      css={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        outline: 'none',
        background: euiTheme.colors.backgroundBasePlain,
      }}
    >
      <div
        css={{
          display: 'flex',
          flexDirection: 'column',
          borderBottom: `${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBasePlain}`,
        }}
      >
        <div
          css={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: euiTheme.size.s, // 8px between icon tile and name/description
            padding: `${euiTheme.size.m} ${euiTheme.size.m} ${euiTheme.size.s}`,
          }}
        >
          <span
            css={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              // Match the 40×40 step icon tiles (Actions menu / graph weight).
              width: euiTheme.size.xxl,
              height: euiTheme.size.xxl,
              flex: '0 0 auto',
              borderRadius: euiTheme.border.radius.small,
              border: `${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBasePlain}`,
              background: euiTheme.colors.backgroundBaseSubdued,
            }}
          >
            <StepIcon stepType={stepType} executionStatus={undefined} size="m" />
          </span>
          <div css={{ minWidth: 0, flex: '1 1 auto' }}>
            {isEditingName ? (
              <div css={{ display: 'flex', flexDirection: 'column', gap: euiTheme.size.xs }}>
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
                    // Keep compressed control height; weight matches the title row.
                    fontWeight: euiTheme.font.weight.bold,
                  }}
                />
                {nameError ? (
                  <EuiText size="xs" color="danger" data-test-subj="workflowStepConfigPanelNameError">
                    {nameError}
                  </EuiText>
                ) : null}
              </div>
            ) : (
              <EuiTitle size="xxs">
                <h3
                  css={{
                    display: 'flex',
                    alignItems: 'center',
                    // Match compressed EuiFieldText height so edit mode does not reflow.
                    minHeight: euiTheme.size.xl,
                    maxWidth: '100%',
                    margin: 0,
                  }}
                >
                  <div
                    css={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: euiTheme.size.xs,
                      minWidth: 0,
                      maxWidth: '100%',
                      minHeight: euiTheme.size.xl,
                      // No inline-start padding — parent gap is the 8px from the icon tile.
                      paddingInlineEnd: euiTheme.size.xs,
                      borderRadius: euiTheme.border.radius.small,
                      background: 'transparent',
                      '&:hover, &:focus-within': {
                        background: euiTheme.colors.backgroundBaseSubdued,
                      },
                    }}
                  >
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
                        textAlign: 'left',
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
                    <EuiButtonIcon
                      iconType="pencil"
                      size="xs"
                      color="text"
                      aria-label={editNameLabel}
                      onClick={beginNameEdit}
                      data-test-subj="workflowStepConfigPanelEditName"
                      css={{ flex: '0 0 auto' }}
                    />
                  </div>
                </h3>
              </EuiTitle>
            )}
            <div
              data-test-subj="workflowStepConfigPanelSubtitle"
              css={{
                display: 'flex',
                alignItems: 'baseline',
                gap: euiTheme.size.xs,
                minWidth: 0,
              }}
            >
              <EuiText
                size="xs"
                color="subdued"
                data-test-subj="workflowStepConfigPanelCatalog"
                css={{ flex: '0 1 auto', minWidth: 0, whiteSpace: 'nowrap' }}
              >
                {catalogLabel}
              </EuiText>
              <EuiText size="xs" color="subdued" css={{ flex: '0 0 auto' }} aria-hidden>
                ·
              </EuiText>
              <EuiToolTip content={stepType} disableScreenReaderOutput>
                <EuiText
                  size="xs"
                  color="subdued"
                  data-test-subj="workflowStepConfigPanelType"
                  css={{
                    flex: '1 1 auto',
                    minWidth: 0,
                    fontFamily: euiTheme.font.familyCode,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {stepType}
                </EuiText>
              </EuiToolTip>
            </div>
          </div>
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
        <EuiTabs
          size="s"
          bottomBorder={false}
          data-test-subj="workflowStepConfigPanelViewToggle"
          aria-label={i18n.translate('workflows.stepConfigPanel.viewToggleLegend', {
            defaultMessage: 'Step editor view',
          })}
          css={{ paddingInline: euiTheme.size.m }}
        >
          {viewOptions.map((option) => (
            <EuiTab
              key={option.id}
              isSelected={view === option.id}
              onClick={() => setView(option.id as PanelView)}
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
          overflow: view === 'yaml' ? 'hidden' : 'auto',
          ...(view === 'form'
            ? {
                paddingInline: euiTheme.size.m,
                paddingBlock: euiTheme.size.s,
                boxSizing: 'border-box' as const,
              }
            : null),
        }}
      >
        {view === 'form' ? (
          parsed.valid ? (
            <StepForm
              fields={fields}
              fragment={fragment}
              initialFragment={initialFragment}
              indent={indent}
              stepType={stepType}
              showValidation={showValidation}
              isFallbackStep={isFallbackStep}
              referenceCatalog={referenceCatalog}
              missingName={isEmptyFieldValue(committedStepName)}
              onChange={handleFieldChange}
              onFragmentChange={setFragment}
              onDraftErrorChange={handleDraftErrorChange}
              onRevealErrorPort={onRevealErrorPort}
              onViewFallbackOnCanvas={onViewFallbackOnCanvas}
            />
          ) : (
            <EuiText size="s" color="danger" data-test-subj="workflowStepConfigPanelFormBlocked">
              {i18n.translate('workflows.stepConfigPanel.invalidYamlForForm', {
                defaultMessage: 'Fix the YAML to edit this step as a form. {error}',
                values: { error: parsed.error ?? '' },
              })}
            </EuiText>
          )
        ) : (
          <div
            css={{
              height: '100%',
              width: '100%',
              minHeight: 240,
              // Monaco theme uses a transparent editor background; the container
              // supplies the subtle fill (same token as the main YAML editor).
              background: euiTheme.colors.backgroundBaseSubdued,
              overflow: 'hidden',
            }}
          >
            <CodeEditor
              languageId={YAML_LANG_ID}
              value={fragment}
              onChange={setFragment}
              height="100%"
              aria-label={i18n.translate('workflows.stepConfigPanel.yamlAriaLabel', {
                defaultMessage: 'Step YAML',
              })}
              options={{
                theme: WORKFLOWS_MONACO_EDITOR_THEME,
                automaticLayout: true,
                fontSize: 12,
                minimap: { enabled: false },
                lineNumbersMinChars: 3,
                scrollBeyondLastLine: false,
                tabSize: indent,
              }}
              dataTestSubj="workflowStepConfigPanelYaml"
            />
          </div>
        )}
      </div>

      <div
        css={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: euiTheme.size.s,
          padding: euiTheme.size.m,
          borderTop: `${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBasePlain}`,
        }}
      >
        <EuiButtonEmpty size="s" onClick={onCancel} data-test-subj="workflowStepConfigPanelCancel">
          {i18n.translate('workflows.stepConfigPanel.cancel', { defaultMessage: 'Cancel' })}
        </EuiButtonEmpty>
        <EuiButton
          size="s"
          fill
          onClick={handleSave}
          isDisabled={!parsed.valid || hasFormErrors}
          data-test-subj="workflowStepConfigPanelSave"
        >
          {i18n.translate('workflows.stepConfigPanel.save', { defaultMessage: 'Save step' })}
        </EuiButton>
      </div>
    </div>
  );
}

function StepForm({
  fields,
  fragment,
  initialFragment,
  indent,
  stepType,
  showValidation,
  isFallbackStep,
  referenceCatalog,
  missingName,
  onChange,
  onFragmentChange,
  onDraftErrorChange,
  onRevealErrorPort,
  onViewFallbackOnCanvas,
}: {
  fields: readonly StepFormField[];
  fragment: string;
  initialFragment: string;
  indent: number;
  stepType: string;
  showValidation: boolean;
  isFallbackStep: boolean;
  referenceCatalog: ReturnType<typeof buildDataReferenceCatalog>;
  missingName: boolean;
  onChange: (field: StepFormField, value: unknown) => void;
  onFragmentChange: (next: string) => void;
  onDraftErrorChange: (id: string, error: string | undefined) => void;
  onRevealErrorPort?: () => void;
  onViewFallbackOnCanvas?: (stepName: string) => void;
}) {
  const { euiTheme } = useEuiTheme();
  const configurationId = useGeneratedHtmlId({ prefix: 'workflowStepConfigConfiguration' });
  const advancedId = useGeneratedHtmlId({ prefix: 'workflowStepConfigAdvancedFields' });
  const errorHandlingId = useGeneratedHtmlId({ prefix: 'workflowStepConfigErrorHandling' });

  // Placement is a pure function of the schema — never of field values.
  // Required → Configuration; optionals → Advanced unless `advanced: false` promotes.
  const { configurationFields, advancedFields } = useMemo(() => {
    const configuration: StepFormField[] = [];
    const advanced: StepFormField[] = [];
    for (const field of fields) {
      if (field.required || field.advanced === false) configuration.push(field);
      else advanced.push(field);
    }
    return { configurationFields: configuration, advancedFields: advanced };
  }, [fields]);

  const showErrorHandling =
    !isFallbackStep && stepSupportsErrorHandling(stepType);
  const showAdvanced = advancedFields.length > 0;
  const sectionCount = 1 + (showAdvanced ? 1 : 0) + (showErrorHandling ? 1 : 0);
  const useAccordionChrome = sectionCount >= 2;

  // Live count from the same requiredness source as the node incomplete indicator.
  const liveMissingRequiredCount = useMemo(() => {
    let count = missingName ? 1 : 0;
    for (const field of fields) {
      if (!field.required) continue;
      if (isEmptyFieldValue(toJs(readFragmentValue(fragment, field.path)))) count += 1;
    }
    return count;
  }, [fields, fragment, missingName]);

  const errorConfigured = showErrorHandling && hasOnFailureConfigured(fragment);

  // Sibling EuiFormRows: within-field gap is EUI row-gap (4px); between-field gap is size.l.
  const formStackCss = {
    '.euiFormRow + .euiFormRow': {
      marginTop: euiTheme.size.l,
    },
  };

  const renderField = (field: StepFormField, showOptionalMarker: boolean) => (
    <StepFieldRow
      key={fieldId(field)}
      field={field}
      value={toJs(readFragmentValue(fragment, field.path))}
      showValidation={showValidation}
      referenceCatalog={referenceCatalog}
      showOptionalMarker={showOptionalMarker}
      onChange={(value) => onChange(field, value)}
      onDraftErrorChange={(error) => onDraftErrorChange(fieldId(field), error)}
    />
  );

  const configurationBody = (
    <div css={formStackCss}>
      {configurationFields.map((field) => renderField(field, true))}
    </div>
  );

  const advancedBody =
    showAdvanced ? (
      <div css={formStackCss}>
        {advancedFields.map((field) => renderField(field, false))}
      </div>
    ) : null;

  const errorBody = showErrorHandling ? (
    <StepErrorHandlingSection
      fragment={fragment}
      indent={indent}
      onFragmentChange={onFragmentChange}
      onRevealErrorPort={onRevealErrorPort}
      onViewFallbackOnCanvas={onViewFallbackOnCanvas}
    />
  ) : null;

  if (!useAccordionChrome) {
    return (
      <div
        data-test-subj="workflowStepConfigPanelForm"
        key={initialFragment}
        // Match the scroll container's inline padding when accordion chrome is absent.
        css={{ paddingTop: euiTheme.size.m }}
      >
        {configurationBody}
      </div>
    );
  }

  const sectionDivider = {
    borderTop: `${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBasePlain}`,
  };

  // Match shared-ux FlyoutAccordion: EuiTitle xs (16px), no EUI default underline.
  const accordionButtonCss = {
    minHeight: 42,
    alignItems: 'center' as const,
    // EUI accordion buttons underline on hover/focus by default.
    '&:hover, &:focus': {
      textDecoration: 'none !important',
    },
  };

  const sectionHeader = (title: string, badge?: React.ReactNode) => (
    <span
      css={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: euiTheme.size.s,
        width: '100%',
        paddingRight: euiTheme.size.s,
      }}
    >
      <EuiTitle size="xs" css={{ fontSize: euiTheme.size.base }}>
        <span>{title}</span>
      </EuiTitle>
      {badge}
    </span>
  );

  const missingBadge =
    liveMissingRequiredCount > 0 ? (
      <EuiBadge
        color="warning"
        iconType="warning"
        data-test-subj="workflowStepConfigMissingRequiredBadge"
      >
        {liveMissingRequiredCount === 1
          ? i18n.translate('workflows.stepConfigPanel.oneRequiredMissing', {
              defaultMessage: '1 required field missing',
            })
          : i18n.translate('workflows.stepConfigPanel.nRequiredMissing', {
              defaultMessage: '{count} required fields missing',
              values: { count: liveMissingRequiredCount },
            })}
      </EuiBadge>
    ) : null;

  // Remount accordions when the panel rebinds so section defaults reset.
  return (
    <div data-test-subj="workflowStepConfigPanelForm" key={initialFragment}>
      <EuiAccordion
        id={configurationId}
        initialIsOpen
        buttonProps={{ css: accordionButtonCss }}
        buttonContent={sectionHeader(
          i18n.translate('workflows.stepConfigPanel.required', {
            defaultMessage: 'Required',
          }),
          missingBadge
        )}
        data-test-subj="workflowStepConfigConfiguration"
      >
        <div css={{ paddingBottom: euiTheme.size.m }}>{configurationBody}</div>
      </EuiAccordion>

      {showAdvanced ? (
        <div css={sectionDivider}>
          <EuiAccordion
            id={advancedId}
            initialIsOpen={false}
            buttonProps={{ css: accordionButtonCss }}
            buttonContent={sectionHeader(
              i18n.translate('workflows.stepConfigPanel.optional', {
                defaultMessage: 'Optional',
              })
            )}
            data-test-subj="workflowStepConfigAdvancedFields"
          >
            <div css={{ paddingBottom: euiTheme.size.m }}>{advancedBody}</div>
          </EuiAccordion>
        </div>
      ) : null}

      {showErrorHandling ? (
        <div css={sectionDivider}>
          <EuiAccordion
            id={errorHandlingId}
            initialIsOpen={false}
            buttonProps={{ css: accordionButtonCss }}
            buttonContent={sectionHeader(
              i18n.translate('workflows.stepConfigPanel.errorHandling', {
                defaultMessage: 'Error handling',
              }),
              errorConfigured ? <ErrorHandlingConfiguredBadge /> : null
            )}
            data-test-subj="workflowStepConfigErrorHandlingSection"
          >
            <div css={{ paddingBottom: euiTheme.size.m }}>{errorBody}</div>
          </EuiAccordion>
        </div>
      ) : null}
    </div>
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
  onChange,
  onDraftErrorChange,
}: {
  field: StepFormField;
  value: unknown;
  showValidation: boolean;
  referenceCatalog: ReturnType<typeof buildDataReferenceCatalog>;
  showOptionalMarker: boolean;
  onChange: (value: unknown) => void;
  onDraftErrorChange: (error: string | undefined) => void;
}) {
  const { euiTheme } = useEuiTheme();
  const switchId = useGeneratedHtmlId({ prefix: `workflowStepConfigSwitch-${fieldId(field)}` });
  const [accused, setAccused] = useState(false);
  const [jsonDraftError, setJsonDraftError] = useState<string | undefined>();

  useEffect(() => {
    if (showValidation) setAccused(true);
  }, [showValidation]);

  useEffect(() => () => onDraftErrorChange(undefined), [onDraftErrorChange]);

  const setDraftError = useCallback(
    (error: string | undefined) => {
      setJsonDraftError(error);
      onDraftErrorChange(error);
    },
    [onDraftErrorChange]
  );

  const optionalLabel = i18n.translate('workflows.stepConfigPanel.optional', {
    defaultMessage: 'Optional',
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

  const labelAppend =
    showOptionalMarker && !field.required ? (
      <EuiText size="xs" color="subdued">
        {optionalLabel}
      </EuiText>
    ) : undefined;

  const helpText = representable
    ? field.description
    : i18n.translate('workflows.stepConfigPanel.definedInYaml', {
        defaultMessage: 'Defined in YAML',
      });

  const testSubj = `workflowStepConfigField-${field.path.join('.')}`;

  if (!representable) {
    return (
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
    );
  }

  if (field.kind === 'boolean') {
    // Compact: label + switch on one line (8px gap), Optional right-aligned; help 4px below.
    return (
      <div
        className="euiFormRow"
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

  switch (field.kind) {
    case 'number':
      return (
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
      return (
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
      return (
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
          />
        </StepValidatedFormRow>
      );
    case 'text':
    default:
      return (
        <StepValidatedFormRow {...rowProps}>
          <ReferenceCapableField
            catalog={referenceCatalog}
            value={value === undefined || value === null ? '' : String(value)}
            onChange={onChange}
          >
            {({
              value: textValue,
              teachingPlaceholder,
              atButton,
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
                append={atButton}
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
 * Monaco-backed field. JSON-language fields hold structured YAML values, so
 * the editor text is JSON and only valid JSON is written back; invalid drafts
 * stay local until they parse. Height is bounded (~160px) with vertical resize.
 * Invalid borders only paint when the parent marks `isInvalid` (blur/save).
 * Reference-capable via shared ReferenceCapableField (typed @ / {{ + @ button).
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
}: {
  field: StepFormField;
  value: unknown;
  catalog: ReturnType<typeof buildDataReferenceCatalog>;
  onChange: (value: unknown) => void;
  testSubj: string;
  isInvalid: boolean;
  onBlur: () => void;
  onDraftErrorChange: (error: string | undefined) => void;
}) {
  const { euiTheme } = useEuiTheme();
  const isJson = field.language === 'json';
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
  const [draft, setDraft] = useState(external);

  useEffect(() => {
    setDraft(external);
    onDraftErrorChange(undefined);
  }, [external, onDraftErrorChange]);

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell || typeof ResizeObserver === 'undefined') return;
    const syncHeight = () => {
      setEditorHeight(Math.max(CODE_EDITOR_HEIGHT, Math.floor(shell.clientHeight)));
    };
    syncHeight();
    const observer = new ResizeObserver(syncHeight);
    observer.observe(shell);
    return () => observer.disconnect();
  }, []);

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

  return (
    <ReferenceCapableField catalog={catalog} value={draft} onChange={applyDraft}>
      {({ teachingPlaceholder, atButton, reportChange, registerSelection }) => (
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
                top: euiTheme.size.xxs,
                right: euiTheme.size.xxs,
                zIndex: 2,
              }}
            >
              {atButton}
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
                folding: false,
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

