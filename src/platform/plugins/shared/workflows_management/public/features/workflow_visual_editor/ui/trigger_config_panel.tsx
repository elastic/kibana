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
  EuiEmptyPrompt,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
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
} from '@kbn/workflows-ui';
import { StepIcon } from '../../../shared/ui/step_icons/step_icon';
import {
  findStepsReferencingInput,
  parseInputsToSchemaProperties,
  SchemaPropertyList,
  schemaPropertiesToJsonSchema,
  type SchemaPropertyField,
} from '../../../shared/ui/schema_property_builder';
import {
  FlyoutMonacoFrame,
  getFlyoutMonacoEditorOptions,
} from './flyout_monaco_frame';

ensureWorkflowGraphEuiIcons();

export interface TriggerConfigPanelProps {
  readonly triggerType: string;
  readonly triggerLabel: string;
  /** Trigger YAML fragment (a mapping) the panel starts from. */
  readonly initialFragment: string;
  /** Full workflow YAML — used to warn when renaming/deleting referenced inputs. */
  readonly workflowYaml?: string;
  readonly onCancel: () => void;
  readonly onSave: (fragment: string) => void;
  readonly size?: number;
  readonly minWidth?: number;
  readonly maxWidth?: number;
  readonly onResize?: (width: number) => void;
}

const DEFAULT_FLYOUT_SIZE = 560;
const DEFAULT_FLYOUT_MIN_WIDTH = 420;

type ParametersMode = 'form' | 'yaml';

const detectIndent = (yaml: string): number => {
  for (const line of yaml.split('\n')) {
    const match = line.match(/^( +)\S/);
    if (match) return match[1].length;
  }
  return 2;
};

/**
 * Write JSON-Schema-shaped `inputs` onto the trigger fragment.
 * // TODO(engine): confirm inputs schema shape — `required` is a parent-level
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
    // TODO(engine): confirm inputs schema shape
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
 * Edit-mode flyout for a workflow trigger — same shell as {@link StepConfigPanel}
 * (EuiFlyout + Visual builder / YAML tabs). Manual triggers expose an Inputs
 * builder; scheduled triggers expose the interval field. Alert triggers are
 * read-only (event fields come from the detection rule).
 */
export function TriggerConfigPanel({
  triggerType,
  triggerLabel,
  initialFragment,
  workflowYaml = '',
  onCancel,
  onSave,
  size = DEFAULT_FLYOUT_SIZE,
  minWidth = DEFAULT_FLYOUT_MIN_WIDTH,
  maxWidth,
  onResize,
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

  const handleClose = useCallback(() => {
    onCancel();
  }, [onCancel]);

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

  const handleSave = useCallback(() => {
    if (!parsed.valid) return;
    onSave(fragment);
  }, [parsed.valid, onSave, fragment]);

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
      label: i18n.translate('workflows.triggerConfigPanel.builderTab', {
        defaultMessage: 'Visual builder',
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

  const showManualInputs = triggerType === 'manual';
  const showScheduledSettings = triggerType === 'scheduled';

  return (
    <EuiFlyout
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
      data-test-subj="workflowTriggerConfigPanel"
    >
      <EuiFlyoutHeader
        hasBorder
        css={{
          '&&': { paddingBottom: 0 },
        }}
      >
        <div
          css={{
            display: 'flex',
            alignItems: 'center',
            gap: euiTheme.size.m,
            padding: `${euiTheme.size.base} ${euiTheme.size.base} ${euiTheme.size.s}`,
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
                  chip.iconColor
                    ? { '& svg, & svg *': { fill: chip.iconColor } }
                    : undefined,
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
          <EuiToolTip content={closeLabel} disableScreenReaderOutput>
            <EuiButtonIcon
              iconType="cross"
              color="text"
              aria-label={closeLabel}
              onClick={onCancel}
              data-test-subj="workflowTriggerConfigPanelClose"
            />
          </EuiToolTip>
        </div>
        <EuiTabs
          size="s"
          bottomBorder={false}
          data-test-subj="workflowTriggerConfigPanelTabs"
          aria-label={i18n.translate('workflows.triggerConfigPanel.editorModeLegend', {
            defaultMessage: 'Trigger editor mode',
          })}
          css={{ paddingInline: euiTheme.size.base }}
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
      </EuiFlyoutHeader>

      <EuiFlyoutBody
        css={{
          '.euiFlyoutBody__overflow': {
            display: 'flex',
            flexDirection: 'column',
          },
          '.euiFlyoutBody__overflowContent': {
            display: 'flex',
            flexDirection: 'column',
            flex: '1 1 auto',
            minHeight: 0,
          },
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
                value={fragment}
                onChange={setFragment}
                height="100%"
                aria-label={i18n.translate('workflows.triggerConfigPanel.yamlAriaLabel', {
                  defaultMessage: 'Trigger YAML',
                })}
                options={getFlyoutMonacoEditorOptions(euiTheme, { tabSize: indent })}
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
                  <EuiText size="s" color="danger" data-test-subj="workflowTriggerConfigPanelInvalid">
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
                          value={inputsJsonDraft}
                          onChange={handleInputsJsonChange}
                          height="100%"
                          aria-label={i18n.translate(
                            'workflows.triggerConfigPanel.inputsSchemaAriaLabel',
                            { defaultMessage: 'Inputs JSON Schema' }
                          )}
                          options={getFlyoutMonacoEditorOptions(euiTheme, { tabSize: indent })}
                          dataTestSubj="workflowTriggerConfigPanelInputsSchema"
                        />
                      </FlyoutMonacoFrame>
                    ) : (
                      <SchemaPropertyList
                        properties={manualFields}
                        onChange={syncManualFieldsToFragment}
                        findReferencingSteps={findReferencingSteps}
                        dataTestSubjPrefix="workflowTriggerConfigInput"
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
            // 16px inset to match header / body.
            paddingBlock: euiTheme.size.base,
            paddingInline: euiTheme.size.base,
          }}
        >
          <EuiFlexGroup justifyContent="flexEnd" gutterSize="m" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                onClick={onCancel}
                data-test-subj="workflowTriggerConfigPanelCancel"
              >
                {i18n.translate('workflows.triggerConfigPanel.cancel', { defaultMessage: 'Cancel' })}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                onClick={handleSave}
                isDisabled={!parsed.valid}
                data-test-subj="workflowTriggerConfigPanelSave"
              >
                {i18n.translate('workflows.triggerConfigPanel.save', {
                  defaultMessage: 'Save trigger',
                })}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
}
