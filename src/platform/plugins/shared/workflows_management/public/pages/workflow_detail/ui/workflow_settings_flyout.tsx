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
  EuiBadge,
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
  EuiTabs,
  EuiTab,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux-v7';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  getInputsFromDefinition,
  normalizeFieldsToJsonSchema,
} from '@kbn/workflows/spec/lib/field_conversion';
import { updateWorkflowYamlFields } from '../../../../common/lib/yaml/update_workflow_yaml_fields';
import {
  selectEditorWorkflowDefinition,
  selectYamlString,
} from '../../../entities/workflows/store/workflow_detail/selectors';
import { setYamlString } from '../../../entities/workflows/store/workflow_detail/slice';

export interface WorkflowSettingsFlyoutProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly readOnly?: boolean;
}

/**
 * TODO(slice5): as real Inputs / Outputs / Constants editors land, register
 * each here with `isReal: true`. Tab chrome renders only when ≥2 tabs are real.
 * Stub YAML-redirect groups must not be registered as tabs.
 */
const SETTINGS_TAB_REGISTRY = [
  {
    id: 'general' as const,
    isReal: true,
    label: i18n.translate('workflows.workflowSettingsFlyout.tab.general', {
      defaultMessage: 'General',
    }),
  },
  // { id: 'inputs', isReal: true, label: '...' },
  // { id: 'outputs', isReal: true, label: '...' },
  // { id: 'constants', isReal: true, label: '...' },
] as const;

type SettingsTabId = (typeof SETTINGS_TAB_REGISTRY)[number]['id'];

const realSettingsTabs = () => SETTINGS_TAB_REGISTRY.filter((tab) => tab.isReal);

const fieldNamesFromJsonSchema = (schema: unknown): string[] => {
  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) {
    return [];
  }
  const properties = (schema as { properties?: unknown }).properties;
  if (!properties || typeof properties !== 'object' || Array.isArray(properties)) {
    return [];
  }
  return Object.keys(properties as Record<string, unknown>);
};

const constNamesFromDefinition = (definition: { consts?: unknown } | null | undefined): string[] => {
  const consts = definition?.consts;
  if (!consts || typeof consts !== 'object' || Array.isArray(consts)) {
    return [];
  }
  return Object.keys(consts as Record<string, unknown>);
};

const StubFieldList = ({
  names,
  emptyTestSubj,
  listTestSubj,
  emptyMessage,
}: {
  names: string[];
  emptyTestSubj: string;
  listTestSubj: string;
  emptyMessage: React.ReactNode;
}) => {
  if (names.length === 0) {
    return (
      <EuiText size="s" color="subdued" data-test-subj={emptyTestSubj}>
        {emptyMessage}
      </EuiText>
    );
  }

  return (
    <EuiFlexGroup gutterSize="s" wrap responsive={false} data-test-subj={listTestSubj}>
      {names.map((fieldName) => (
        <EuiFlexItem grow={false} key={fieldName}>
          <EuiBadge color="hollow">{fieldName}</EuiBadge>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};

export const WorkflowSettingsFlyout = ({
  isOpen,
  onClose,
  readOnly = false,
}: WorkflowSettingsFlyoutProps) => {
  const titleId = useGeneratedHtmlId();
  const dispatch = useDispatch();
  const yamlString = useSelector(selectYamlString);
  const definition = useSelector(selectEditorWorkflowDefinition);

  const [name, setName] = useState('');
  const [tagOptions, setTagOptions] = useState<Array<EuiComboBoxOptionOption<string>>>([]);
  const [selectedTabId, setSelectedTabId] = useState<SettingsTabId>('general');

  const tabs = useMemo(() => realSettingsTabs(), []);
  const showTabChrome = tabs.length >= 2;

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setName(typeof definition?.name === 'string' ? definition.name : '');
    const tags = Array.isArray(definition?.tags) ? definition.tags : [];
    setTagOptions(tags.map((tag) => ({ label: tag })));
    setSelectedTabId('general');
  }, [isOpen, definition?.name, definition?.tags]);

  const inputFieldNames = useMemo(
    () => fieldNamesFromJsonSchema(getInputsFromDefinition(definition)),
    [definition]
  );

  const outputFieldNames = useMemo(
    () => fieldNamesFromJsonSchema(normalizeFieldsToJsonSchema(definition?.outputs)),
    [definition]
  );

  const constantNames = useMemo(() => constNamesFromDefinition(definition), [definition]);

  const applyYamlPatch = useCallback(
    (patch: { name?: string; tags?: string[] }) => {
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
      applyYamlPatch({ name: next });
    },
    [applyYamlPatch]
  );

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
      const exists = flattenedOptions.some(
        (option) => option.label.toLowerCase() === normalized.toLowerCase()
      );
      if (exists) {
        return;
      }
      const next = [...tagOptions, { label: normalized }];
      setTagOptions(next);
      applyYamlPatch({ tags: next.map((option) => option.label) });
    },
    [applyYamlPatch, tagOptions]
  );

  if (!isOpen) {
    return null;
  }

  // V1 is tab-less: General (name/tags) + Input/Output/Constants stubs share one body.
  // When showTabChrome becomes true, only the selected real tab's body renders.
  const showGeneralBody = !showTabChrome || selectedTabId === 'general';

  return (
    <EuiFlyout
      onClose={onClose}
      size="s"
      ownFocus
      data-test-subj="workflowSettingsFlyout"
      aria-labelledby={titleId}
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={titleId}>
            <FormattedMessage
              id="workflows.workflowSettingsFlyout.title"
              defaultMessage="Workflow settings"
            />
          </h2>
        </EuiTitle>
        {showTabChrome ? (
          <>
            <EuiSpacer size="m" />
            <EuiTabs>
              {tabs.map((tab) => (
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
          </>
        ) : null}
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        {showGeneralBody ? (
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
                disabled={readOnly}
                data-test-subj="workflowSettingsNameInput"
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
                selectedOptions={tagOptions}
                onChange={handleTagsChange}
                onCreateOption={handleCreateTag}
                isDisabled={readOnly}
                noSuggestions
                data-test-subj="workflowSettingsTagsInput"
              />
            </EuiFormRow>

            {!showTabChrome ? (
              <>
                <EuiSpacer size="m" />

                <EuiFormRow
                  fullWidth
                  label={i18n.translate('workflows.workflowSettingsFlyout.inputLabel', {
                    defaultMessage: 'Input',
                  })}
                  helpText={i18n.translate('workflows.workflowSettingsFlyout.inputDescription', {
                    defaultMessage:
                      'Inputs are defined on the manual trigger. Edit them in the YAML editor for now.',
                  })}
                >
                  <StubFieldList
                    names={inputFieldNames}
                    emptyTestSubj="workflowSettingsInputsEmpty"
                    listTestSubj="workflowSettingsInputsList"
                    emptyMessage={
                      <FormattedMessage
                        id="workflows.workflowSettingsFlyout.inputEmpty"
                        defaultMessage="No inputs defined."
                      />
                    }
                  />
                </EuiFormRow>

                <EuiSpacer size="m" />

                <EuiFormRow
                  fullWidth
                  label={i18n.translate('workflows.workflowSettingsFlyout.outputLabel', {
                    defaultMessage: 'Output',
                  })}
                  helpText={i18n.translate('workflows.workflowSettingsFlyout.outputDescription', {
                    defaultMessage:
                      'Outputs declare the workflow return contract. Edit them in the YAML editor for now.',
                  })}
                >
                  <StubFieldList
                    names={outputFieldNames}
                    emptyTestSubj="workflowSettingsOutputsEmpty"
                    listTestSubj="workflowSettingsOutputsList"
                    emptyMessage={
                      <FormattedMessage
                        id="workflows.workflowSettingsFlyout.outputEmpty"
                        defaultMessage="No outputs defined."
                      />
                    }
                  />
                </EuiFormRow>

                <EuiSpacer size="m" />

                <EuiFormRow
                  fullWidth
                  label={i18n.translate('workflows.workflowSettingsFlyout.constantsLabel', {
                    defaultMessage: 'Constants',
                  })}
                  helpText={i18n.translate(
                    'workflows.workflowSettingsFlyout.constantsDescription',
                    {
                      defaultMessage:
                        'Constants are workflow-scoped variables. Edit them in the YAML editor for now.',
                    }
                  )}
                >
                  <StubFieldList
                    names={constantNames}
                    emptyTestSubj="workflowSettingsConstantsEmpty"
                    listTestSubj="workflowSettingsConstantsList"
                    emptyMessage={
                      <FormattedMessage
                        id="workflows.workflowSettingsFlyout.constantsEmpty"
                        defaultMessage="No constants defined."
                      />
                    }
                  />
                </EuiFormRow>

                {/*
                  TODO(sharing): Sharing is intentionally absent. When it ships,
                  decide the affordance separately (likely a prominent header
                  action, not a settings tab) — do not reintroduce a "Coming soon"
                  stub here.
                */}
              </>
            ) : null}
          </>
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

