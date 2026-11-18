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
  EuiConfirmModal,
  EuiEmptyPrompt,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIcon,
  EuiTab,
  EuiTabs,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { isMap, parseDocument, stringify as stringifyYaml } from 'yaml';
import { CodeEditor } from '@kbn/code-editor';
import { i18n } from '@kbn/i18n';
import { YAML_LANG_ID } from '@kbn/monaco';
import {
  ensureWorkflowGraphEuiIcons,
  resolveNodeChipStyle,
  workflowsEditorChromeOverrides,
} from '@kbn/workflows-ui';
import { detectIndent } from '@kbn/workflows-yaml';
import { FlyoutMonacoFrame, getFlyoutMonacoEditorOptions } from './flyout_monaco_frame';
import {
  findStepsReferencingInput,
  parseInputsToSchemaProperties,
  schemaPropertiesToJsonSchema,
  type SchemaPropertyField,
  SchemaPropertyList,
} from '../../../shared/ui/schema_property_builder';
import { StepIcon } from '../../../shared/ui/step_icons/step_icon';
import { isStepFragmentDirty, parseStepFragment } from '../lib/parse_step_fragment';

ensureWorkflowGraphEuiIcons();

export interface TriggerConfigPanelProps {
  readonly triggerType: string;
  readonly triggerLabel: string;
  /** Trigger YAML fragment (a mapping) the panel starts from. */
  readonly initialFragment: string;
  /** Full workflow YAML — used to warn when renaming/deleting referenced inputs. */
  readonly workflowYaml?: string;
  /**
   * 'insert': a trigger the user just added, whose footer button removes it. 'edit': an existing
   * trigger, whose footer button puts it back as it was when the panel opened. Every edit is
   * applied as it is made either way.
   */
  readonly mode: 'insert' | 'edit';
  /** Closes the panel, keeping what is already applied: ✕ and Escape route here. */
  readonly onClose: () => void;
  /** Footer button: removes a new trigger, or restores the trigger the panel opened with. */
  readonly onRevert: () => void;
  /** Every valid draft, as it changes. */
  readonly onFragmentChange: (fragment: string) => void;
  /** Shows the trigger without letting the user change it; the footer only offers Close. */
  readonly readOnly?: boolean;
  /** Read-only footer action: show this trigger in the workflow's YAML. */
  readonly onOpenInYaml?: () => void;
}

type ParametersMode = 'form' | 'yaml';

/**
 * Write JSON-Schema-shaped `inputs` onto the trigger fragment.
 * // TODO: confirm inputs schema shape — `required` is a parent-level
 * array; required means the caller must supply a non-empty value.
 */
const writeManualInputs = (
  fragment: string,
  fields: readonly SchemaPropertyField[],
  indent: number
): string => {
  const doc = parseDocument(fragment);
  if (!isMap(doc.contents)) return fragment;
  const named = fields.filter((f) => f.name.trim());
  if (named.length === 0) {
    doc.contents.delete('inputs');
  } else {
    // TODO: confirm inputs schema shape
    doc.contents.set('inputs', doc.createNode(schemaPropertiesToJsonSchema(named)));
  }
  return doc.toString({ indent, lineWidth: 0 });
};

const writeScheduledEvery = (fragment: string, every: string, indent: number): string => {
  const doc = parseDocument(fragment);
  if (!isMap(doc.contents)) return fragment;
  doc.contents.set('with', doc.createNode({ every }));
  return doc.toString({ indent, lineWidth: 0 });
};

const readScheduledEvery = (fragment: string): string => {
  const doc = parseDocument(fragment);
  if (!isMap(doc.contents)) return '5m';
  const withNode = doc.contents.get('with');
  if (!isMap(withNode)) return '5m';
  const every = withNode.get('every');
  return typeof every === 'string' && every.trim() ? every : '5m';
};

/**
 * Edit-mode panel for a workflow trigger — same canvas-bounded shell as
 * {@link StepConfigPanel} (Form / YAML tabs). Manual triggers expose
 * an Inputs builder; scheduled triggers expose the interval field. Alert
 * triggers are read-only (event fields come from the detection rule).
 */
export function TriggerConfigPanel({
  triggerType,
  triggerLabel,
  initialFragment,
  workflowYaml = '',
  mode,
  onClose,
  onRevert,
  onFragmentChange,
  readOnly = false,
  onOpenInYaml,
}: TriggerConfigPanelProps) {
  const { euiTheme } = useEuiTheme();
  const [parametersMode, setParametersMode] = useState<ParametersMode>('form');
  const [fragment, setFragment] = useState(initialFragment);
  const indent = useMemo(() => detectIndent(initialFragment), [initialFragment]);
  const titleId = useGeneratedHtmlId({ prefix: 'workflowTriggerConfigTitle' });
  const settingsAccordionId = useGeneratedHtmlId({ prefix: 'workflowTriggerConfigSettings' });

  const chip = resolveNodeChipStyle(euiTheme, triggerType, true, {
    isSuccess: false,
    isFailed: false,
  });

  const [manualFields, setManualFields] = useState<SchemaPropertyField[]>([]);
  const [inputsJsonDraft, setInputsJsonDraft] = useState('');
  const [everyDraft, setEveryDraft] = useState(() => readScheduledEvery(initialFragment));

  useEffect(() => {
    setFragment(initialFragment);
    setParametersMode('form');
    if (triggerType !== 'manual') {
      setManualFields([]);
      setInputsJsonDraft('');
      return;
    }
    const doc = parseDocument(initialFragment);
    const js =
      doc.errors.length === 0 && isMap(doc.contents)
        ? (doc.toJS() as Record<string, unknown>)
        : undefined;
    const nextInputs = parseInputsToSchemaProperties(js?.inputs);
    if (Array.isArray(nextInputs)) {
      setManualFields(nextInputs);
      setInputsJsonDraft('');
    } else if (nextInputs === 'unsupported' && js?.inputs) {
      setManualFields([]);
      setInputsJsonDraft(stringifyYaml(js.inputs, { lineWidth: 0 }));
    } else {
      setManualFields([]);
      setInputsJsonDraft('');
    }
  }, [initialFragment, triggerType]);

  const parsed = useMemo(() => {
    const doc = parseDocument(fragment);
    const valid = doc.errors.length === 0 && isMap(doc.contents);
    const js = valid ? (doc.toJS() as Record<string, unknown>) : undefined;
    return { valid, js, error: doc.errors[0]?.message };
  }, [fragment]);

  const isUnsupportedInputs = useMemo(() => {
    if (triggerType !== 'manual' || !parsed.js) return false;
    return parseInputsToSchemaProperties(parsed.js.inputs) === 'unsupported';
  }, [triggerType, parsed.js]);

  useEffect(() => {
    if (triggerType === 'scheduled') setEveryDraft(readScheduledEvery(fragment));
  }, [triggerType, fragment]);

  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // Edits are applied as they are made, so closing only needs to ask when the draft could not be
  // applied (YAML that does not parse): that is the one thing closing would lose.
  const handleClose = useCallback(() => {
    if (!readOnly && !parsed.valid) {
      setShowDiscardConfirm(true);
      return;
    }
    onClose();
  }, [readOnly, parsed.valid, onClose]);

  useEffect(() => {
    if (!readOnly && parsed.valid) onFragmentChange(fragment);
  }, [readOnly, parsed.valid, fragment, onFragmentChange]);

  const initialParsed = useMemo(() => parseStepFragment(initialFragment), [initialFragment]);
  const isDirty = useMemo(
    () => isStepFragmentDirty(parseStepFragment(fragment), initialParsed),
    [fragment, initialParsed]
  );

  const syncManualFieldsToFragment = useCallback(
    (fields: readonly SchemaPropertyField[]) => {
      setManualFields([...fields]);
      setFragment((current) => writeManualInputs(current, fields, indent));
    },
    [indent]
  );

  const handleInputsJsonChange = useCallback(
    (value: string) => {
      setInputsJsonDraft(value);
      const doc = parseDocument(value);
      if (doc.errors.length > 0) return;
      const root = parseDocument(fragment);
      if (!isMap(root.contents)) return;
      root.contents.set('inputs', doc.contents);
      setFragment(root.toString({ indent, lineWidth: 0 }));
    },
    [fragment, indent]
  );

  const handleEveryChange = useCallback(
    (value: string) => {
      setEveryDraft(value);
      setFragment((current) => writeScheduledEvery(current, value.trim() || '5m', indent));
    },
    [indent]
  );

  const findReferencingSteps = useCallback(
    (name: string) => findStepsReferencingInput(workflowYaml, name),
    [workflowYaml]
  );

  const setParametersModeAndHydrate = useCallback(
    (mode: ParametersMode) => {
      setParametersMode(mode);
      if (mode !== 'form' || triggerType !== 'manual') return;
      // Re-read inputs from YAML when returning from the YAML tab so form
      // state picks up external edits — without doing this on every form
      // keystroke (that remounted accordions and collapsed them).
      const result = parseInputsToSchemaProperties(parsed.js?.inputs);
      if (Array.isArray(result)) {
        setManualFields(result);
        setInputsJsonDraft('');
      } else if (result === 'unsupported' && parsed.js?.inputs) {
        setManualFields([]);
        setInputsJsonDraft(stringifyYaml(parsed.js.inputs, { lineWidth: 0 }));
      }
    },
    [parsed.js, triggerType]
  );

  const editorModeOptions: Array<{ id: ParametersMode; iconType: string; label: string }> = [
    {
      id: 'form',
      iconType: 'workflow',
      label: i18n.translate('workflows.triggerConfigPanel.formTab', {
        defaultMessage: 'Form',
      }),
    },
    {
      id: 'yaml',
      iconType: 'code',
      label: i18n.translate('workflows.triggerConfigPanel.yamlTab', {
        defaultMessage: 'YAML',
      }),
    },
  ];

  const isBuilderMode = parametersMode === 'form';
  const closeLabel = i18n.translate('workflows.triggerConfigPanel.close', {
    defaultMessage: 'Close',
  });

  const discardTitle = i18n.translate('workflows.triggerConfigPanel.discardTitle', {
    defaultMessage: 'Discard changes to this trigger?',
  });

  const showManualInputs = triggerType === 'manual';
  const showScheduledSettings = triggerType === 'scheduled';

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      data-test-subj="workflowTriggerConfigPanel"
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          handleClose();
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
                honor `iconColor`, but EUI glyphs need the SVG fill wrapper used
                by NodeStepIcon.
              */}
              <span
                css={[
                  { color: chip.iconColor, display: 'inline-flex', lineHeight: 0 },
                  chip.iconColor ? { '& svg, & svg *': { fill: chip.iconColor } } : undefined,
                ]}
              >
                <StepIcon
                  stepType={triggerType}
                  executionStatus={undefined}
                  size="m"
                  iconColor={chip.iconColor}
                  color={chip.iconColor}
                />
              </span>
            </span>
            <EuiTitle size="xxs">
              <h2
                id={titleId}
                css={{
                  margin: 0,
                  minWidth: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                data-test-subj="workflowTriggerConfigPanelTitle"
              >
                {triggerLabel}
              </h2>
            </EuiTitle>
          </div>
        </div>
        <EuiToolTip content={closeLabel} disableScreenReaderOutput>
          <EuiButtonIcon
            iconType="cross"
            color="text"
            aria-label={closeLabel}
            onClick={handleClose}
            data-test-subj="workflowTriggerConfigPanelClose"
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
          data-test-subj="workflowTriggerConfigPanelTabs"
          aria-label={i18n.translate('workflows.triggerConfigPanel.editorModeLegend', {
            defaultMessage: 'Trigger editor mode',
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
              onClick={() => setParametersModeAndHydrate(option.id)}
              prepend={<EuiIcon type={option.iconType} aria-hidden />}
              data-test-subj={`workflowTriggerConfigPanelView-${option.id}`}
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
            display: 'flex',
            flexDirection: 'column',
            flex: '1 1 auto',
            minHeight: 0,
            width: '100%',
          }}
        >
          {!isBuilderMode ? (
            <FlyoutMonacoFrame minHeight={200}>
              <CodeEditor
                languageId={YAML_LANG_ID}
                chromeOverrides={workflowsEditorChromeOverrides}
                value={fragment}
                onChange={setFragment}
                height="100%"
                aria-label={i18n.translate('workflows.triggerConfigPanel.yamlAriaLabel', {
                  defaultMessage: 'Trigger YAML',
                })}
                options={{
                  ...getFlyoutMonacoEditorOptions(euiTheme, { tabSize: indent }),
                  readOnly,
                }}
                dataTestSubj="workflowTriggerConfigPanelYaml"
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
                  boxSizing: 'border-box',
                }}
              >
                {!parsed.valid ? (
                  <EuiText
                    size="s"
                    color="danger"
                    data-test-subj="workflowTriggerConfigPanelInvalid"
                  >
                    {i18n.translate('workflows.triggerConfigPanel.invalidYaml', {
                      defaultMessage: 'Fix the YAML to edit this trigger as a form. {error}',
                      values: { error: parsed.error ?? '' },
                    })}
                  </EuiText>
                ) : showManualInputs ? (
                  <div data-test-subj="workflowTriggerConfigPanelInputs">
                    {isUnsupportedInputs ? (
                      <FlyoutMonacoFrame height={280} variant="inset">
                        <CodeEditor
                          languageId={YAML_LANG_ID}
                          chromeOverrides={workflowsEditorChromeOverrides}
                          value={inputsJsonDraft}
                          onChange={handleInputsJsonChange}
                          height="100%"
                          aria-label={i18n.translate(
                            'workflows.triggerConfigPanel.inputsSchemaAriaLabel',
                            { defaultMessage: 'Inputs JSON Schema' }
                          )}
                          options={{
                            ...getFlyoutMonacoEditorOptions(euiTheme, { tabSize: indent }),
                            readOnly,
                          }}
                          dataTestSubj="workflowTriggerConfigPanelInputsSchema"
                        />
                      </FlyoutMonacoFrame>
                    ) : (
                      <SchemaPropertyList
                        properties={manualFields}
                        onChange={syncManualFieldsToFragment}
                        findReferencingSteps={findReferencingSteps}
                        dataTestSubjPrefix="workflowTriggerConfigInput"
                        readOnly={readOnly}
                      />
                    )}
                  </div>
                ) : showScheduledSettings ? (
                  <EuiAccordion
                    id={settingsAccordionId}
                    initialIsOpen
                    paddingSize="none"
                    buttonContent={
                      <EuiTitle size="xxs">
                        <h4>
                          {i18n.translate('workflows.triggerConfigPanel.settingsAccordion', {
                            defaultMessage: 'Settings',
                          })}
                        </h4>
                      </EuiTitle>
                    }
                    data-test-subj="workflowTriggerConfigPanelAccordion-settings"
                  >
                    <div css={{ paddingTop: euiTheme.size.m }}>
                      <EuiFormRow
                        label={i18n.translate('workflows.triggerConfigPanel.everyLabel', {
                          defaultMessage: 'Run every',
                        })}
                        helpText={i18n.translate('workflows.triggerConfigPanel.everyHelp', {
                          defaultMessage: 'Minimum 1 minute. Examples: 1m, 90s, 2h, 1d.',
                        })}
                        fullWidth
                        compressed
                      >
                        <EuiFieldText
                          compressed
                          fullWidth
                          value={everyDraft}
                          disabled={readOnly}
                          onChange={(e) => handleEveryChange(e.target.value)}
                          data-test-subj="workflowTriggerConfigPanelEvery"
                        />
                      </EuiFormRow>
                    </div>
                  </EuiAccordion>
                ) : (
                  <EuiEmptyPrompt
                    paddingSize="m"
                    titleSize="xs"
                    iconType="checkCircleFill"
                    title={
                      <h3>
                        {i18n.translate('workflows.triggerConfigPanel.alertEmptyTitle', {
                          defaultMessage: 'No configuration needed',
                        })}
                      </h3>
                    }
                    body={
                      <EuiText size="s" color="subdued">
                        {i18n.translate('workflows.triggerConfigPanel.alertInfo', {
                          defaultMessage:
                            'Alert triggers run when a matching detection rule fires. Event fields come from the detection rule — they are not defined here.',
                        })}
                      </EuiText>
                    }
                    data-test-subj="workflowTriggerConfigPanelAlertInfo"
                  />
                )}
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
          {readOnly && onOpenInYaml ? (
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                iconType="code"
                onClick={onOpenInYaml}
                data-test-subj="workflowTriggerConfigPanelOpenInYaml"
              >
                {i18n.translate('workflows.triggerConfigPanel.openInYaml', {
                  defaultMessage: 'Open in YAML',
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
          ) : null}
          <EuiFlexItem grow={false}>
            {readOnly ? (
              <EuiButtonEmpty onClick={onClose} data-test-subj="workflowTriggerConfigPanelFooterClose">
                {closeLabel}
              </EuiButtonEmpty>
            ) : mode === 'insert' ? (
              <EuiButtonEmpty
                color="danger"
                iconType="trash"
                onClick={onRevert}
                data-test-subj="workflowTriggerConfigPanelRemoveTrigger"
              >
                {i18n.translate('workflows.triggerConfigPanel.removeTrigger', {
                  defaultMessage: 'Remove trigger',
                })}
              </EuiButtonEmpty>
            ) : (
              <EuiButtonEmpty
                iconType="undo"
                onClick={onRevert}
                isDisabled={!isDirty}
                data-test-subj="workflowTriggerConfigPanelResetTrigger"
              >
                {i18n.translate('workflows.triggerConfigPanel.resetTrigger', {
                  defaultMessage: 'Reset trigger',
                })}
              </EuiButtonEmpty>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>

      {showDiscardConfirm ? (
        <EuiConfirmModal
          title={discardTitle}
          aria-label={discardTitle}
          onCancel={() => setShowDiscardConfirm(false)}
          onConfirm={() => {
            setShowDiscardConfirm(false);
            onClose();
          }}
          cancelButtonText={i18n.translate('workflows.triggerConfigPanel.keepEditing', {
            defaultMessage: 'Keep editing',
          })}
          confirmButtonText={i18n.translate('workflows.triggerConfigPanel.discard', {
            defaultMessage: 'Discard',
          })}
          buttonColor="danger"
          defaultFocusedButton="cancel"
          data-test-subj="workflowTriggerConfigPanelDiscardModal"
        >
          <EuiText size="s">
            {i18n.translate('workflows.triggerConfigPanel.discardInvalidBody', {
              defaultMessage:
                "This draft has errors and wasn't applied to the trigger. Closing now will discard it.",
            })}
          </EuiText>
        </EuiConfirmModal>
      ) : null}
    </div>
  );
}
