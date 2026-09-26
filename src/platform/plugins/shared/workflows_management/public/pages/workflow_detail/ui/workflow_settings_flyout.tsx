/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiComboBoxOptionOption } from '@elastic/eui';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiComboBox,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFormRow,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiText,
  EuiTextArea,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux-v7';
import { parseDocument } from 'yaml';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { getAllConnectorsWithDynamic } from '../../../../common/schema';
import { updateWorkflowYamlFields } from '../../../../common/lib/yaml/update_workflow_yaml_fields';
import { useWorkflowFiltersOptions } from '../../../entities/workflows/model/use_workflow_stats';
import {
  selectConnectors,
  selectEditorWorkflowDefinition,
  selectYamlString,
} from '../../../entities/workflows/store/workflow_detail/selectors';
import { setYamlString } from '../../../entities/workflows/store/workflow_detail/slice';
import { findStepsReferencingPath } from '../../../shared/ui/schema_property_builder';
import { WorkflowConstantsEditor } from './workflow_constants_editor';
import { WorkflowOutputsEditor } from './workflow_outputs_editor';
import {
  constantsToYamlRecord,
  outputsToJsonSchema,
  parseConstsToFields,
  parseOutputsToFields,
  writeRootYamlMapping,
  type ConstantField,
  type OutputField,
} from './workflow_settings_fields_model';

export interface WorkflowSettingsFlyoutProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly readOnly?: boolean;
}

const SETTINGS_TABS = [
  {
    id: 'general' as const,
    label: i18n.translate('workflows.workflowSettingsFlyout.tab.general', {
      defaultMessage: 'General',
    }),
  },
  {
    id: 'constants' as const,
    label: i18n.translate('workflows.workflowSettingsFlyout.tab.constants', {
      defaultMessage: 'Constants',
    }),
  },
  {
    id: 'outputs' as const,
    label: i18n.translate('workflows.workflowSettingsFlyout.tab.outputs', {
      defaultMessage: 'Outputs',
    }),
  },
] as const;

type SettingsTabId = (typeof SETTINGS_TABS)[number]['id'];

export const WorkflowSettingsFlyout = ({
  isOpen,
  onClose,
  readOnly = false,
}: WorkflowSettingsFlyoutProps) => {
  const titleId = useGeneratedHtmlId();
  const dispatch = useDispatch();
  const yamlString = useSelector(selectYamlString) ?? '';
  const definition = useSelector(selectEditorWorkflowDefinition);
  const loadedConnectors = useSelector(selectConnectors);
  // Same unwrap as the visual editor — store holds ConnectorsResponse, not an array.
  const connectors = useMemo(
    () => getAllConnectorsWithDynamic(loadedConnectors?.connectorTypes),
    [loadedConnectors?.connectorTypes]
  );

  const [selectedTabId, setSelectedTabId] = useState<SettingsTabId>('general');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tagOptions, setTagOptions] = useState<Array<EuiComboBoxOptionOption<string>>>([]);
  const [constantFields, setConstantFields] = useState<ConstantField[]>([]);
  const [outputFields, setOutputFields] = useState<OutputField[]>([]);

  const { data: tagFilterData } = useWorkflowFiltersOptions(['tags']);
  const tagSuggestions = useMemo(
    () =>
      (tagFilterData?.tags ?? [])
        .map((option) =>
          typeof option.label === 'string' ? option.label : String(option.key ?? '')
        )
        .filter((label) => label.length > 0),
    [tagFilterData]
  );

  const suggestionOptions = useMemo((): Array<EuiComboBoxOptionOption<string>> => {
    const selected = new Set(tagOptions.map((o) => o.label.toLowerCase()));
    return tagSuggestions
      .filter((suggestion) => !selected.has(suggestion.toLowerCase()))
      .map((label) => ({ label }));
  }, [tagSuggestions, tagOptions]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setSelectedTabId('general');
    // Hydrate consts/outputs only when the flyout opens — not on every YAML
    // write-through (that remounted accordion cards). Prefer the live YAML
    // document so we don't depend on a stale parsed definition.
    try {
      const doc = parseDocument(yamlString);
      const js = doc.toJS() as Record<string, unknown> | null;
      setConstantFields(parseConstsToFields(js?.consts ?? definition?.consts));
      setOutputFields(parseOutputsToFields(js?.outputs ?? definition?.outputs));
    } catch {
      setConstantFields(parseConstsToFields(definition?.consts));
      setOutputFields(parseOutputsToFields(definition?.outputs));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open-once hydrate
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setName(typeof definition?.name === 'string' ? definition.name : '');
    setDescription(typeof definition?.description === 'string' ? definition.description : '');
    const tags = Array.isArray(definition?.tags) ? definition.tags : [];
    setTagOptions(tags.map((tag) => ({ label: tag })));
  }, [isOpen, definition?.name, definition?.description, definition?.tags]);

  const applyYamlPatch = useCallback(
    (patch: { name?: string; description?: string; tags?: string[] }) => {
      if (readOnly) {
        return;
      }
      const nextYaml = updateWorkflowYamlFields(yamlString, patch);
      if (nextYaml !== yamlString) {
        dispatch(setYamlString(nextYaml));
      }
    },
    [dispatch, readOnly, yamlString]
  );

  const handleNameChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const next = event.target.value;
      setName(next);
      if (next.trim()) {
        applyYamlPatch({ name: next.trim() });
      }
    },
    [applyYamlPatch]
  );

  const handleNameBlur = useCallback(() => {
    const next = name.trim();
    if (!next) {
      setName(typeof definition?.name === 'string' ? definition.name : '');
      return;
    }
    if (next !== definition?.name) {
      applyYamlPatch({ name: next });
    }
  }, [name, definition?.name, applyYamlPatch]);

  const handleDescriptionChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      setDescription(event.target.value);
    },
    []
  );

  const handleDescriptionBlur = useCallback(() => {
    const next = description.trim();
    const current =
      typeof definition?.description === 'string' ? definition.description.trim() : '';
    if (next === current) {
      return;
    }
    applyYamlPatch({ description: next });
  }, [description, definition?.description, applyYamlPatch]);

  const handleTagsChange = useCallback(
    (selected: Array<EuiComboBoxOptionOption<string>>) => {
      setTagOptions(selected);
      applyYamlPatch({ tags: selected.map((option) => option.label) });
    },
    [applyYamlPatch]
  );

  const handleCreateTag = useCallback(
    (searchValue: string, flattenedOptions: Array<EuiComboBoxOptionOption<string>>) => {
      const normalized = searchValue.trim();
      if (!normalized) {
        return;
      }
      const exists = flattenedOptions.some((option) => option.label === normalized);
      if (exists) {
        return;
      }
      const next = [...tagOptions, { label: normalized }];
      setTagOptions(next);
      applyYamlPatch({ tags: next.map((option) => option.label) });
    },
    [applyYamlPatch, tagOptions]
  );

  const handleConstantsChange = useCallback(
    (next: readonly ConstantField[]) => {
      setConstantFields([...next]);
      if (readOnly) return;
      const record = constantsToYamlRecord(next);
      const nextYaml = writeRootYamlMapping(yamlString, 'consts', record);
      if (nextYaml !== yamlString) {
        dispatch(setYamlString(nextYaml));
      }
    },
    [dispatch, readOnly, yamlString]
  );

  const handleOutputsChange = useCallback(
    (next: readonly OutputField[]) => {
      setOutputFields([...next]);
      if (readOnly) return;
      const schema = outputsToJsonSchema(next);
      const nextYaml = writeRootYamlMapping(yamlString, 'outputs', schema);
      if (nextYaml !== yamlString) {
        dispatch(setYamlString(nextYaml));
      }
    },
    [dispatch, readOnly, yamlString]
  );

  const findConstRefs = useCallback(
    (constName: string) => findStepsReferencingPath(yamlString, 'consts', constName),
    [yamlString]
  );

  const findOutputRefs = useCallback(
    (outputName: string) => findStepsReferencingPath(yamlString, 'outputs', outputName),
    [yamlString]
  );

  if (!isOpen) {
    return null;
  }

  return (
    <EuiFlyout
      onClose={onClose}
      size="s"
      data-test-subj="workflowSettingsFlyout"
      aria-labelledby={titleId}
    >
      <EuiFlyoutHeader
        hasBorder
        css={({ euiTheme }) => ({
          '&&': {
            paddingTop: euiTheme.size.base,
            paddingInline: euiTheme.size.base,
            paddingBottom: 0,
          },
        })}
      >
        <EuiTitle size="s">
          <h2 id={titleId}>
            <FormattedMessage
              id="workflows.workflowSettingsFlyout.title"
              defaultMessage="Workflow settings"
            />
          </h2>
        </EuiTitle>
        <EuiSpacer size="m" />
        <EuiTabs size="m" bottomBorder={false} css={{ marginBottom: 0, paddingBottom: 0 }}>
          {SETTINGS_TABS.map((tab) => (
            <EuiTab
              key={tab.id}
              isSelected={selectedTabId === tab.id}
              onClick={() => setSelectedTabId(tab.id)}
              data-test-subj={`workflowSettingsTab-${tab.id}`}
            >
              {tab.label}
            </EuiTab>
          ))}
        </EuiTabs>
      </EuiFlyoutHeader>

      <EuiFlyoutBody
        css={({ euiTheme }) => ({
          '.euiFlyoutBody__overflowContent': {
            padding: euiTheme.size.base,
          },
        })}
      >
        {selectedTabId === 'general' ? (
          <>
            <EuiFormRow
              fullWidth
              compressed
              label={i18n.translate('workflows.workflowSettingsFlyout.nameLabel', {
                defaultMessage: 'Workflow name',
              })}
            >
              <EuiFieldText
                fullWidth
                compressed
                value={name}
                onChange={handleNameChange}
                onBlur={handleNameBlur}
                disabled={readOnly}
                data-test-subj="workflowSettingsNameInput"
              />
            </EuiFormRow>

            <EuiSpacer size="m" />

            <EuiFormRow
              fullWidth
              compressed
              label={i18n.translate('workflows.workflowSettingsFlyout.descriptionLabel', {
                defaultMessage: 'Description',
              })}
            >
              <EuiTextArea
                fullWidth
                compressed
                value={description}
                onChange={handleDescriptionChange}
                onBlur={handleDescriptionBlur}
                disabled={readOnly}
                rows={8}
                placeholder={i18n.translate(
                  'workflows.workflowSettingsFlyout.descriptionPlaceholder',
                  {
                    defaultMessage: 'Add a description…',
                  }
                )}
                data-test-subj="workflowSettingsDescriptionInput"
              />
            </EuiFormRow>

            <EuiSpacer size="m" />

            <EuiFormRow
              fullWidth
              compressed
              label={i18n.translate('workflows.workflowSettingsFlyout.tagsLabel', {
                defaultMessage: 'Tags',
              })}
              helpText={i18n.translate('workflows.workflowSettingsFlyout.tagsHelp', {
                defaultMessage: 'Press Enter to add a tag.',
              })}
            >
              <EuiComboBox
                fullWidth
                compressed
                placeholder={i18n.translate('workflows.workflowSettingsFlyout.tagsPlaceholder', {
                  defaultMessage: 'Add tags',
                })}
                options={suggestionOptions}
                selectedOptions={tagOptions}
                onChange={handleTagsChange}
                onCreateOption={handleCreateTag}
                isDisabled={readOnly}
                data-test-subj="workflowSettingsTagsInput"
              />
            </EuiFormRow>

            <EuiSpacer size="l" />

            <EuiText size="s" color="subdued" data-test-subj="workflowSettingsInputsHint">
              <FormattedMessage
                id="workflows.workflowSettingsFlyout.inputsOnManualHint"
                defaultMessage="Run inputs are defined on the Manual trigger on the canvas — not here."
              />
            </EuiText>
          </>
        ) : null}

        {selectedTabId === 'constants' ? (
          <WorkflowConstantsEditor
            fields={constantFields}
            onChange={handleConstantsChange}
            findReferencingSteps={findConstRefs}
            readOnly={readOnly}
          />
        ) : null}

        {selectedTabId === 'outputs' ? (
          <WorkflowOutputsEditor
            fields={outputFields}
            onChange={handleOutputsChange}
            workflowDefinition={definition}
            connectors={connectors}
            findReferencingSteps={findOutputRefs}
            readOnly={readOnly}
          />
        ) : null}
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose} data-test-subj="workflowSettingsFlyoutClose">
              <FormattedMessage
                id="workflows.workflowSettingsFlyout.close"
                defaultMessage="Close"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton onClick={onClose} fill data-test-subj="workflowSettingsFlyoutDone">
              <FormattedMessage id="workflows.workflowSettingsFlyout.done" defaultMessage="Done" />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
