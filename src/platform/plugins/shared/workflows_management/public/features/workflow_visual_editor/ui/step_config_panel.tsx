/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiComboBox,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiEmptyPrompt,
  EuiFieldNumber,
  EuiFieldText,
  EuiFormRow,
  EuiHorizontalRule,
  EuiIcon,
  EuiPopover,
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
import { isMap, isSeq, parseDocument, stringify as stringifyYaml } from 'yaml';
import { CodeEditor } from '@kbn/code-editor';
import type { AggregateQuery } from '@kbn/es-query';
import ESQLEditorImport from '@kbn/esql-editor';
import { i18n } from '@kbn/i18n';
import { KibanaContextProvider, useKibana } from '@kbn/kibana-react-plugin/public';
import type { WorkflowsServices } from '../../../types';
import { ESQL_LANG_ID, XJSON_LANG_ID, YAML_LANG_ID } from '@kbn/monaco';
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
import { StepErrorHandlingSection } from './step_error_handling_section';

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

type PanelTab = 'parameters' | 'branches' | 'settings';

/** Step types that have user-configurable branching structure. */
const BRANCHING_STEP_TYPES = new Set(['if', 'switch', 'parallel']);
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
}: StepConfigPanelProps) {
  const { euiTheme } = useEuiTheme();
  const [tab, setTab] = useState<PanelTab>('parameters');
  const [parametersMode, setParametersMode] = useState<ParametersMode>('form');
  // The fragment is the single source of truth for Form and YAML.
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

  const showSettings = !isFallbackStep && stepSupportsErrorHandling(stepType);

  const tabOptions: Array<{ id: PanelTab; label: string }> = [
    {
      id: 'parameters',
      label: i18n.translate('workflows.stepConfigPanel.parametersTab', {
        defaultMessage: 'Inputs',
      }),
    },
    ...(BRANCHING_STEP_TYPES.has(stepType)
      ? [
          {
            id: 'branches' as const,
            label: i18n.translate('workflows.stepConfigPanel.branchesTab', {
              defaultMessage: 'Branches',
            }),
          },
        ]
      : []),
    {
      id: 'settings',
      label: i18n.translate('workflows.stepConfigPanel.settingsTab', {
        defaultMessage: 'Settings',
      }),
    },
  ];

  const parametersModeOptions: Array<{
    id: ParametersMode;
    iconType: string;
    label: string;
  }> = [
    {
      id: 'form',
      iconType: 'workflow',
      label: i18n.translate('workflows.stepConfigPanel.builderView', {
        defaultMessage: 'Builder view',
      }),
    },
    {
      id: 'yaml',
      iconType: 'code',
      label: i18n.translate('workflows.stepConfigPanel.yamlView', {
        defaultMessage: 'YAML view',
      }),
    },
  ];

  const isBuilderMode = parametersMode === 'form';

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
            alignItems: 'center',
            gap: euiTheme.size.m,
            padding: `${euiTheme.size.m} ${euiTheme.size.m} ${euiTheme.size.s}`,
          }}
        >
          {/*
            Single-line header: icon · name · pencil. No catalog/type subtitle —
            the user already picked this node, the chip carries the provider,
            and the form fields / YAML view identify the step kind.
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
                <div
                  css={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: euiTheme.size.xs,
                    minHeight: euiTheme.size.xl,
                    justifyContent: 'center',
                  }}
                >
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
                  <h3
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
                  </h3>
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
            {/*
              Builder/YAML picks a *representation of the whole step* (YAML
              covers inputs and settings together) while tabs pick *which part*
              of the step you're viewing — two axes. The toggle sits above the
              tabs in the header so it can govern them without an extra row.
            */}
            <ParametersModeToggle
              mode={parametersMode}
              options={parametersModeOptions}
              onChange={setParametersMode}
            />
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
        {isBuilderMode ? (
          <EuiTabs
            size="s"
            bottomBorder={false}
            data-test-subj="workflowStepConfigPanelTabs"
            aria-label={i18n.translate('workflows.stepConfigPanel.tabsLegend', {
              defaultMessage: 'Step editor sections',
            })}
            css={{ paddingInline: euiTheme.size.m }}
          >
            {tabOptions.map((option) => (
              <EuiTab
                key={option.id}
                isSelected={tab === option.id}
                onClick={() => setTab(option.id)}
                data-test-subj={`workflowStepConfigPanelTab-${option.id}`}
              >
                {option.label}
              </EuiTab>
            ))}
          </EuiTabs>
        ) : null}
      </div>

      <div
        css={{
          flex: '1 1 auto',
          minHeight: 0,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column' as const,
          paddingInline: euiTheme.size.m,
          boxSizing: 'border-box' as const,
        }}
      >
        {!isBuilderMode ? (
          <div
            css={{
              flex: '1 1 auto',
              minHeight: 240,
              height: '100%',
              width: '100%',
              marginBlock: euiTheme.size.m,
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
        ) : (
          <>
            <div
              css={{
                display: tab === 'parameters' ? 'flex' : 'none',
                flexDirection: 'column',
                flex: '1 1 auto',
                minHeight: 0,
                overflow: 'hidden',
                paddingTop: euiTheme.size.m,
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
            </div>

            <div
              css={{
                display: tab === 'branches' ? 'flex' : 'none',
                flexDirection: 'column',
                flex: '1 1 auto',
                minHeight: 0,
                overflow: 'auto',
                paddingBlock: euiTheme.size.m,
                paddingInline: euiTheme.size.m,
              }}
              data-test-subj="workflowStepConfigPanelBranches"
            >
              <BranchesSection
                stepType={stepType}
                fragment={fragment}
                indent={indent}
                onChange={setFragment}
              />
            </div>

            <div
              css={{
                display: tab === 'settings' ? 'block' : 'none',
                flex: '1 1 auto',
                minHeight: 0,
                overflow: 'auto',
                paddingBlock: euiTheme.size.m,
              }}
              data-test-subj="workflowStepConfigPanelSettings"
            >
              {showSettings ? (
                <div data-test-subj="workflowStepConfigErrorHandlingSection">
                  <StepErrorHandlingSection
                    fragment={fragment}
                    indent={indent}
                    onFragmentChange={setFragment}
                    onRevealErrorPort={onRevealErrorPort}
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
          </>
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

/** Icon segmented control — same glyphs/chrome as the canvas Visual/YAML toggle. */
function ParametersModeToggle({
  mode,
  options,
  onChange,
}: {
  mode: ParametersMode;
  options: ReadonlyArray<{ id: ParametersMode; iconType: string; label: string }>;
  onChange: (next: ParametersMode) => void;
}) {
  const { euiTheme } = useEuiTheme();

  return (
    <div
      role="group"
      aria-label={i18n.translate('workflows.stepConfigPanel.parametersModeLegend', {
        defaultMessage: 'Step editor mode',
      })}
      data-test-subj="workflowStepConfigPanelViewToggle"
      css={{
        background: euiTheme.colors.backgroundBaseSubdued,
        border: `1px solid ${euiTheme.colors.borderBaseSubdued}`,
        borderRadius: euiTheme.border.radius.small,
        padding: 3,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        flex: '0 0 auto',
      }}
    >
      {options.map(({ id, iconType, label }) => {
        const active = id === mode;
        return (
          <EuiToolTip key={id} content={label}>
            <button
              type="button"
              title={label}
              aria-label={label}
              aria-pressed={active}
              onClick={() => onChange(id)}
              data-test-subj={`workflowStepConfigPanelView-${id}`}
              css={{
                width: 28,
                height: 28,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                cursor: 'pointer',
                borderRadius: 4,
                padding: 0,
                background: active ? euiTheme.colors.backgroundBasePrimary : 'transparent',
                color: euiTheme.colors.text,
                transition: 'background 120ms ease',
                '&:hover': {
                  background: active
                    ? euiTheme.colors.backgroundBasePrimary
                    : euiTheme.colors.backgroundBaseInteractiveHover,
                },
                '&:focus-visible': {
                  outline: `2px solid ${euiTheme.colors.primary}`,
                  outlineOffset: 2,
                },
              }}
            >
              <EuiIcon
                type={iconType}
                aria-hidden
                color={active ? euiTheme.colors.primaryText : euiTheme.colors.text}
              />
            </button>
          </EuiToolTip>
        );
      })}
    </div>
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
}: {
  fields: readonly StepFormField[];
  /** False when no connector/built-in schema was resolved for this step type. */
  hasSchema: boolean;
  fragment: string;
  showValidation: boolean;
  referenceCatalog: ReturnType<typeof buildDataReferenceCatalog>;
  onChange: (field: StepFormField, value: unknown) => void;
  onDraftErrorChange: (id: string, error: string | undefined) => void;
}) {
  const { euiTheme } = useEuiTheme();
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

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const endSentinelRef = useRef<HTMLDivElement | null>(null);
  const [addFieldPinned, setAddFieldPinned] = useState(false);

  useEffect(() => {
    const root = scrollRef.current;
    const sentinel = endSentinelRef.current;
    if (
      typeof IntersectionObserver === 'undefined' ||
      !root ||
      !sentinel ||
      availableOptionalFields.length === 0
    ) {
      setAddFieldPinned(false);
      return undefined;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        setAddFieldPinned(!entry.isIntersecting);
      },
      { root, threshold: 1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [availableOptionalFields.length, primaryFields.length, revealedOptionalFields.length]);

  const addOptionalButton = (
    <EuiPopover
      isOpen={optionalPickerOpen}
      closePopover={() => setOptionalPickerOpen(false)}
      panelPaddingSize="none"
      anchorPosition="upLeft"
      button={
        <EuiButtonEmpty
          size="s"
          iconType="plusCircle"
          flush="left"
          color="primary"
          onClick={() => setOptionalPickerOpen((open) => !open)}
          data-test-subj="workflowStepConfigAddOptionalField"
        >
          {i18n.translate('workflows.stepConfigPanel.addOptionalField', {
            defaultMessage: 'Add optional field',
          })}
        </EuiButtonEmpty>
      }
    >
      <EuiContextMenuPanel
        items={optionalPickerItems}
        data-test-subj="workflowStepConfigOptionalFieldMenu"
      />
    </EuiPopover>
  );

  return (
    <div
      data-test-subj="workflowStepConfigPanelForm"
      css={{
        display: 'flex',
        flexDirection: 'column',
        flex: '1 1 auto',
        minHeight: 0,
        height: '100%',
      }}
    >
      <div
        ref={scrollRef}
        css={{
          flex: '1 1 auto',
          minHeight: 0,
          overflow: 'auto',
          paddingBottom: euiTheme.size.m,
        }}
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
                        'This step has no inputs to set. You can still rename it above or configure Settings.',
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

        {availableOptionalFields.length > 0 && !addFieldPinned ? (
          <div css={{ marginTop: euiTheme.size.m }}>{addOptionalButton}</div>
        ) : null}
        <div ref={endSentinelRef} aria-hidden css={{ height: 1, width: '100%' }} />
      </div>

      {availableOptionalFields.length > 0 && addFieldPinned ? (
        <div
          css={{
            flex: '0 0 auto',
            borderTop: `${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBasePlain}`,
            boxShadow: `0 -6px 12px -8px rgba(0, 0, 0, 0.18)`,
            background: euiTheme.colors.backgroundBasePlain,
            paddingBlock: euiTheme.size.s,
          }}
        >
          {addOptionalButton}
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
  onRemove,
  onChange,
  onDraftErrorChange,
}: {
  field: StepFormField;
  value: unknown;
  showValidation: boolean;
  referenceCatalog: ReturnType<typeof buildDataReferenceCatalog>;
  showOptionalMarker: boolean;
  onRemove?: () => void;
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
    // True when the stored value is a string — any string means it's a Liquid/Mustache expression.
    const exprMode = typeof value === 'string';

    const switchToExprLabel = i18n.translate('workflows.stepConfigPanel.switchToExpression', {
      defaultMessage: 'Switch to expression mode',
    });
    const switchToTypedLabel = i18n.translate('workflows.stepConfigPanel.switchToTyped', {
      defaultMessage: 'Switch to typed mode',
    });

    const exprToggleButton = (
      <EuiToolTip content={exprMode ? switchToTypedLabel : switchToExprLabel} disableScreenReaderOutput>
        <EuiButtonIcon
          iconType={exprMode ? 'apps' : 'code'}
          size="xs"
          color="text"
          aria-label={exprMode ? switchToTypedLabel : switchToExprLabel}
          aria-pressed={exprMode}
          onClick={() => (exprMode ? onChange(false) : onChange(''))}
          data-test-subj={`${testSubj}-exprToggle`}
        />
      </EuiToolTip>
    );

    // Compact: label + switch on one line (8px gap), Optional + toggle right-aligned; help 4px below.
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
          {exprMode ? (
            // Expression mode: text input occupies full width, toggle on the right.
            <>
              <label css={{ cursor: 'default', flex: '0 0 auto' }}>{labelContent}</label>
              <div css={{ display: 'flex', alignItems: 'center', gap: euiTheme.size.xs, flex: '1 1 auto', minWidth: 0 }}>
                <ReferenceCapableField
                  catalog={referenceCatalog}
                  value={typeof value === 'string' ? value : ''}
                  onChange={onChange}
                >
                  {({ value: textValue, teachingPlaceholder, atButton, reportChange, attachInputRef, isOpen }) => (
                    <EuiFieldText
                      compressed
                      fullWidth
                      isInvalid={isInvalid}
                      value={textValue}
                      placeholder={textValue.length === 0 ? teachingPlaceholder : undefined}
                      inputRef={attachInputRef}
                      onChange={(e) => {
                        const next = e.target.value;
                        reportChange(next, e.target.selectionStart ?? next.length);
                      }}
                      onBlur={accuseIfInvalid}
                      append={[atButton, exprToggleButton]}
                      data-test-subj={testSubj}
                      aria-expanded={isOpen}
                    />
                  )}
                </ReferenceCapableField>
              </div>
              {labelAppend}
            </>
          ) : (
            // Typed mode: checkbox + label, toggle on the right.
            <>
              <div css={{ display: 'inline-flex', alignItems: 'center', gap: euiTheme.size.s, minWidth: 0 }}>
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
              <div css={{ display: 'inline-flex', alignItems: 'center', gap: euiTheme.size.xs }}>
                {labelAppend}
                {exprToggleButton}
              </div>
            </>
          )}
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
    case 'number': {
      // Expression mode: any string containing {{ is a Liquid template, not a numeric literal.
      const numExprMode = typeof value === 'string' && (value as string).includes('{{');
      const numSwitchToExprLabel = i18n.translate('workflows.stepConfigPanel.switchToExpression', {
        defaultMessage: 'Switch to expression mode',
      });
      const numSwitchToTypedLabel = i18n.translate('workflows.stepConfigPanel.switchToTyped', {
        defaultMessage: 'Switch to typed mode',
      });
      const numExprToggle = (
        <EuiToolTip content={numExprMode ? numSwitchToTypedLabel : numSwitchToExprLabel} disableScreenReaderOutput>
          <EuiButtonIcon
            iconType={numExprMode ? 'apps' : 'code'}
            size="xs"
            color="text"
            aria-label={numExprMode ? numSwitchToTypedLabel : numSwitchToExprLabel}
            aria-pressed={numExprMode}
            onClick={() => (numExprMode ? onChange(undefined) : onChange('{{  }}'))}
            data-test-subj={`${testSubj}-exprToggle`}
          />
        </EuiToolTip>
      );
      return wrapRow(
        <StepValidatedFormRow {...rowProps}>
          {numExprMode ? (
            <ReferenceCapableField
              catalog={referenceCatalog}
              value={typeof value === 'string' ? value : ''}
              onChange={onChange}
            >
              {({ value: textValue, teachingPlaceholder, atButton, reportChange, attachInputRef, isOpen }) => (
                <EuiFieldText
                  compressed
                  fullWidth
                  isInvalid={isInvalid}
                  value={textValue}
                  placeholder={textValue.length === 0 ? teachingPlaceholder : undefined}
                  inputRef={attachInputRef}
                  onChange={(e) => {
                    const next = e.target.value;
                    reportChange(next, e.target.selectionStart ?? next.length);
                  }}
                  onBlur={accuseIfInvalid}
                  append={[atButton, numExprToggle]}
                  data-test-subj={testSubj}
                  aria-expanded={isOpen}
                />
              )}
            </ReferenceCapableField>
          ) : (
            <EuiFieldNumber
              compressed
              fullWidth
              isInvalid={isInvalid}
              value={typeof value === 'number' || typeof value === 'string' ? value : ''}
              onChange={(e) =>
                onChange(e.target.value === '' ? undefined : Number(e.target.value))
              }
              onBlur={accuseIfInvalid}
              append={numExprToggle}
              data-test-subj={testSubj}
            />
          )}
        </StepValidatedFormRow>
      );
    }
    case 'select': {
      // Combobox: enum values + {{ }} template entry — same control for typed and expression mode.
      const selectOptions = [
        ...(field.options ?? []).map((o) => ({ label: o })),
        { label: '{{ }}' },
      ];
      const strVal = value === undefined || value === null ? undefined : String(value);
      const selectedOptions = strVal !== undefined ? [{ label: strVal }] : [];
      return wrapRow(
        <StepValidatedFormRow {...rowProps}>
          <EuiComboBox
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
        </StepValidatedFormRow>
      );
    }
    case 'code':
      return wrapRow(
        <StepValidatedFormRow {...rowProps}>
          {field.language === 'esql' ? (
            <ESQLEditorField
              value={value}
              onChange={onChange}
              testSubj={testSubj}
            />
          ) : (
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
          )}
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
  // Match EUI textarea / form-control padding (`controlPadding` = size.m).
  const controlPaddingPx = parseInt(String(euiTheme.size.m), 10);
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

  // Sync from the form value only when that value changes — do not depend on
  // unstable callback identities (those re-created every parent render and would
  // reset the draft on every keystroke).
  useEffect(() => {
    setDraft(external);
    onDraftErrorChange(undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onDraftErrorChange is intentionally omitted
  }, [external]);

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
                top: euiTheme.size.m,
                right: euiTheme.size.m,
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
                // Monaco only pads top/bottom; lineDecorationsWidth insets the left
                // when line numbers are off — matches EUI textarea controlPadding.
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

function ESQLEditorField({
  value,
  onChange,
  testSubj,
}: {
  value: unknown;
  onChange: (value: unknown) => void;
  testSubj: string;
}) {
  // ESQLEditor uses useKibana<{ core: CoreStart, data, ... }> internally.
  // The workflows app provides a flat context (WorkflowsServices = CoreStart & deps),
  // so we re-provide the services in the nested shape ESQLEditor expects.
  const { services } = useKibana<WorkflowsServices>();
  const esqlServices = { ...services, core: services };

  const query: AggregateQuery = { esql: typeof value === 'string' ? value : '' };
  return (
    <KibanaContextProvider services={esqlServices}>
      <div data-test-subj={testSubj}>
        <ESQLEditorImport
          query={query}
          onTextLangQueryChange={(next: AggregateQuery) => {
            onChange('esql' in next ? next.esql ?? '' : '');
          }}
          onTextLangQuerySubmit={async () => {}}
          hideRunQueryButton
          hideQueryHistory
          expandToFitQueryOnMount
          editorIsInline
        />
      </div>
    </KibanaContextProvider>
  );
}

// ── BranchesSection ───────────────────────────────────────────────────────────
// Lens color-mapping style: each case/branch is a row with criteria + delete.
// Only shown in the "Branches" tab for if / switch / parallel step types.

function BranchesSection({
  stepType,
  fragment,
  indent,
  onChange,
}: {
  stepType: string;
  fragment: string;
  indent: number;
  onChange: (next: string) => void;
}) {
  const { euiTheme } = useEuiTheme();

  // ── Read-only derived state ─────────────────────────────────────────────────

  const cases = useMemo((): Array<{ match: string }> => {
    if (stepType !== 'switch') return [];
    const doc = parseDocument(fragment);
    if (!isMap(doc.contents)) return [];
    const seq = doc.getIn(['cases'], false);
    if (!isSeq(seq)) return [];
    return seq.items.filter(isMap).map((item) => ({ match: String(toJs(item.get('match', false)) ?? '') }));
  }, [fragment, stepType]);

  const branchCount = useMemo((): number => {
    if (stepType !== 'parallel') return 0;
    const doc = parseDocument(fragment);
    if (!isMap(doc.contents)) return 0;
    const seq = doc.getIn(['branches'], false);
    return isSeq(seq) ? seq.items.length : 0;
  }, [fragment, stepType]);

  // ── Writers ─────────────────────────────────────────────────────────────────

  const addCase = useCallback(() => {
    const doc = parseDocument(fragment);
    if (!isMap(doc.contents)) return;
    const existing = doc.getIn(['cases'], false);
    if (isSeq(existing)) {
      existing.add(doc.createNode({ match: '', steps: [] }));
    } else {
      doc.setIn(['cases'], doc.createNode([{ match: '', steps: [] }]));
    }
    onChange(doc.toString({ indent, lineWidth: 0 }));
  }, [fragment, indent, onChange]);

  const removeCase = useCallback(
    (idx: number) => {
      const doc = parseDocument(fragment);
      if (!isMap(doc.contents)) return;
      const seq = doc.getIn(['cases'], false);
      if (!isSeq(seq)) return;
      seq.delete(idx);
      onChange(doc.toString({ indent, lineWidth: 0 }));
    },
    [fragment, indent, onChange]
  );

  const updateCaseMatch = useCallback(
    (idx: number, value: string) => {
      const doc = parseDocument(fragment);
      if (!isMap(doc.contents)) return;
      const seq = doc.getIn(['cases'], false);
      if (!isSeq(seq)) return;
      const item = seq.items[idx];
      if (!isMap(item)) return;
      item.set('match', value);
      onChange(doc.toString({ indent, lineWidth: 0 }));
    },
    [fragment, indent, onChange]
  );

  const addBranch = useCallback(() => {
    const doc = parseDocument(fragment);
    if (!isMap(doc.contents)) return;
    const existing = doc.getIn(['branches'], false);
    if (isSeq(existing)) {
      existing.add(doc.createNode({ steps: [] }));
    } else {
      doc.setIn(['branches'], doc.createNode([{ steps: [] }]));
    }
    onChange(doc.toString({ indent, lineWidth: 0 }));
  }, [fragment, indent, onChange]);

  const removeBranch = useCallback(
    (idx: number) => {
      const doc = parseDocument(fragment);
      if (!isMap(doc.contents)) return;
      const seq = doc.getIn(['branches'], false);
      if (!isSeq(seq)) return;
      seq.delete(idx);
      onChange(doc.toString({ indent, lineWidth: 0 }));
    },
    [fragment, indent, onChange]
  );

  // ── Shared row style ────────────────────────────────────────────────────────

  const rowCss = {
    display: 'flex',
    alignItems: 'center',
    gap: euiTheme.size.s,
    padding: `${euiTheme.size.s} ${euiTheme.size.m}`,
    background: euiTheme.colors.backgroundBasePlain,
  };

  const labelCss = {
    fontFamily: euiTheme.font.family,
    fontSize: 12,
    fontWeight: 500 as const,
    color: euiTheme.colors.textSubdued,
    flex: '0 0 auto',
    minWidth: 48,
  };

  const listBorderCss = {
    border: `${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBasePlain}`,
    borderRadius: euiTheme.border.radius.small,
    overflow: 'hidden' as const,
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  if (stepType === 'if') {
    return (
      <div data-test-subj="workflowBranchesSectionIf">
        <EuiTitle size="xs">
          <h4>
            {i18n.translate('workflows.branchesSection.if.title', { defaultMessage: 'Branches' })}
          </h4>
        </EuiTitle>
        <EuiText size="xs" color="subdued" css={{ marginBottom: euiTheme.size.m }}>
          {i18n.translate('workflows.branchesSection.if.description', {
            defaultMessage: 'Both branches are always rendered on the canvas.',
          })}
        </EuiText>
        <div css={listBorderCss}>
          <div css={rowCss}>
            <span css={labelCss}>Then</span>
            <EuiText size="xs" color="subdued">
              {i18n.translate('workflows.branchesSection.if.then', {
                defaultMessage: 'When condition is true',
              })}
            </EuiText>
          </div>
          <EuiHorizontalRule margin="none" />
          <div css={rowCss}>
            <span css={labelCss}>Else</span>
            <EuiText size="xs" color="subdued">
              {i18n.translate('workflows.branchesSection.if.else', {
                defaultMessage: 'When condition is false',
              })}
            </EuiText>
          </div>
        </div>
      </div>
    );
  }

  if (stepType === 'switch') {
    return (
      <div data-test-subj="workflowBranchesSectionSwitch">
        <EuiTitle size="xs">
          <h4>
            {i18n.translate('workflows.branchesSection.switch.title', { defaultMessage: 'Cases' })}
          </h4>
        </EuiTitle>
        <EuiText size="xs" color="subdued" css={{ marginBottom: euiTheme.size.m }}>
          {i18n.translate('workflows.branchesSection.switch.description', {
            defaultMessage: 'Each case routes to a different path when the value matches.',
          })}
        </EuiText>
        <div css={listBorderCss}>
          {cases.map((c, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <EuiHorizontalRule margin="none" />}
              <div css={rowCss} data-test-subj={`workflowBranchesCaseRow-${idx}`}>
                <span css={labelCss}>
                  {i18n.translate('workflows.branchesSection.switch.matchLabel', {
                    defaultMessage: 'Match',
                  })}
                </span>
                <EuiFieldText
                  compressed
                  value={c.match}
                  placeholder={i18n.translate('workflows.branchesSection.switch.matchPlaceholder', {
                    defaultMessage: 'value',
                  })}
                  onChange={(e) => updateCaseMatch(idx, e.target.value)}
                  css={{ flex: '1 1 auto' }}
                  data-test-subj={`workflowBranchesCaseMatch-${idx}`}
                  aria-label={i18n.translate('workflows.branchesSection.switch.matchAriaLabel', {
                    defaultMessage: 'Match value for case {n}',
                    values: { n: idx + 1 },
                  })}
                />
                <EuiButtonIcon
                  iconType="trash"
                  color="danger"
                  size="xs"
                  onClick={() => removeCase(idx)}
                  aria-label={i18n.translate('workflows.branchesSection.switch.removeCase', {
                    defaultMessage: 'Remove case {n}',
                    values: { n: idx + 1 },
                  })}
                  data-test-subj={`workflowBranchesCaseRemove-${idx}`}
                />
              </div>
            </React.Fragment>
          ))}
          {cases.length > 0 && <EuiHorizontalRule margin="none" />}
          <div css={{ ...rowCss, opacity: 0.6 }} data-test-subj="workflowBranchesDefaultRow">
            <span css={labelCss}>
              {i18n.translate('workflows.branchesSection.switch.default', {
                defaultMessage: 'Default',
              })}
            </span>
            <EuiText size="xs" color="subdued">
              {i18n.translate('workflows.branchesSection.switch.defaultDescription', {
                defaultMessage: 'When no case matches',
              })}
            </EuiText>
          </div>
        </div>
        <EuiButtonEmpty
          size="s"
          iconType="plusInCircle"
          flush="left"
          onClick={addCase}
          css={{ marginTop: euiTheme.size.s }}
          data-test-subj="workflowBranchesAddCase"
        >
          {i18n.translate('workflows.branchesSection.switch.addCase', {
            defaultMessage: 'Add case',
          })}
        </EuiButtonEmpty>
      </div>
    );
  }

  if (stepType === 'parallel') {
    return (
      <div data-test-subj="workflowBranchesSectionParallel">
        <EuiTitle size="xs">
          <h4>
            {i18n.translate('workflows.branchesSection.parallel.title', {
              defaultMessage: 'Branches',
            })}
          </h4>
        </EuiTitle>
        <EuiText size="xs" color="subdued" css={{ marginBottom: euiTheme.size.m }}>
          {i18n.translate('workflows.branchesSection.parallel.description', {
            defaultMessage: 'All branches run in parallel and rejoin when all complete.',
          })}
        </EuiText>
        <div css={listBorderCss}>
          {Array.from({ length: branchCount }, (_, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <EuiHorizontalRule margin="none" />}
              <div css={rowCss} data-test-subj={`workflowBranchesBranchRow-${idx}`}>
                <span css={labelCss}>
                  {i18n.translate('workflows.branchesSection.parallel.branchLabel', {
                    defaultMessage: 'Branch {n}',
                    values: { n: idx + 1 },
                  })}
                </span>
                <div css={{ flex: '1 1 auto' }} />
                <EuiButtonIcon
                  iconType="trash"
                  color="danger"
                  size="xs"
                  onClick={() => removeBranch(idx)}
                  aria-label={i18n.translate('workflows.branchesSection.parallel.removeBranch', {
                    defaultMessage: 'Remove branch {n}',
                    values: { n: idx + 1 },
                  })}
                  data-test-subj={`workflowBranchesBranchRemove-${idx}`}
                />
              </div>
            </React.Fragment>
          ))}
          {branchCount === 0 && (
            <div css={{ ...rowCss, opacity: 0.6 }}>
              <EuiText size="xs" color="subdued">
                {i18n.translate('workflows.branchesSection.parallel.empty', {
                  defaultMessage: 'No branches yet — add one to get started.',
                })}
              </EuiText>
            </div>
          )}
        </div>
        <EuiButtonEmpty
          size="s"
          iconType="plusInCircle"
          flush="left"
          onClick={addBranch}
          css={{ marginTop: euiTheme.size.s }}
          data-test-subj="workflowBranchesAddBranch"
        >
          {i18n.translate('workflows.branchesSection.parallel.addBranch', {
            defaultMessage: 'Add branch',
          })}
        </EuiButtonEmpty>
      </div>
    );
  }

  return null;
}

