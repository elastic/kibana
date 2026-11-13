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
  EuiButtonIcon,
  EuiComboBox,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIcon,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiText,
  EuiTextArea,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { ensureWorkflowGraphEuiIcons } from '@kbn/workflows-ui';
import { useWorkflowSettingsDraft } from './use_workflow_settings_draft';
import { WorkflowConstantsEditor } from '../../../pages/workflow_detail/ui/workflow_constants_editor';
import { WorkflowOutputsEditor } from '../../../pages/workflow_detail/ui/workflow_outputs_editor';

ensureWorkflowGraphEuiIcons();

export interface WorkflowSettingsDPanelProps {
  readonly readOnly?: boolean;
  readonly onClose: () => void;
}

type SettingsTab = 'general' | 'constants' | 'outputs';

const TABS: Array<{ id: SettingsTab; label: string }> = [
  {
    id: 'general',
    label: i18n.translate('workflows.settingsSurface.d.tab.general', {
      defaultMessage: 'General',
    }),
  },
  {
    id: 'constants',
    label: i18n.translate('workflows.settingsSurface.d.tab.constants', {
      defaultMessage: 'Constants',
    }),
  },
  {
    id: 'outputs',
    label: i18n.translate('workflows.settingsSurface.d.tab.outputs', {
      defaultMessage: 'Outputs',
    }),
  },
];

/**
 * Option D: one canvas node opens the step config panel with the three
 * workflow-settings tabs (General, Constants, Outputs).
 */
export function WorkflowSettingsDPanel({ readOnly = false, onClose }: WorkflowSettingsDPanelProps) {
  const { euiTheme } = useEuiTheme();
  const titleId = useGeneratedHtmlId({ prefix: 'workflowSettingsDPanel' });
  const [tab, setTab] = useState<SettingsTab>('general');
  const draft = useWorkflowSettingsDraft({ hydrateKey: 'd', readOnly });

  const tagOptions = useMemo(
    (): Array<EuiComboBoxOptionOption<string>> => draft.tags.map((label) => ({ label })),
    [draft.tags]
  );

  const closeLabel = i18n.translate('workflows.settingsSurface.d.close', {
    defaultMessage: 'Close',
  });

  const handleNameBlur = useCallback(() => {
    const next = draft.name.trim();
    if (!next) {
      draft.setName(typeof draft.definition?.name === 'string' ? draft.definition.name : '');
      return;
    }
    draft.applyYamlPatch({ name: next });
  }, [draft]);

  const handleDescriptionBlur = useCallback(() => {
    draft.applyYamlPatch({ description: draft.description.trim() });
  }, [draft]);

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      data-test-subj="workflowSettingsDPanel"
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
            padding: `${euiTheme.size.base} ${euiTheme.size.xl} 0 ${euiTheme.size.base}`,
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
              border: `1px solid ${euiTheme.colors.borderBaseSubdued}`,
              background: euiTheme.colors.backgroundBaseSubdued,
            }}
          >
            <EuiIcon type="gear" color="text" aria-hidden={true} />
          </span>
          <EuiTitle size="xxs">
            <h2 id={titleId} css={{ margin: 0 }}>
              {i18n.translate('workflows.settingsSurface.d.title', {
                defaultMessage: 'Workflow settings',
              })}
            </h2>
          </EuiTitle>
        </div>
        <EuiToolTip content={closeLabel} disableScreenReaderOutput>
          <EuiButtonIcon
            iconType="cross"
            color="text"
            aria-label={closeLabel}
            onClick={onClose}
            data-test-subj="workflowSettingsDPanelClose"
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
          css={{ paddingInline: euiTheme.size.base, marginBlockStart: 0 }}
        >
          {TABS.map((item) => (
            <EuiTab
              key={item.id}
              isSelected={tab === item.id}
              onClick={() => setTab(item.id)}
              data-test-subj={`workflowSettingsDTab-${item.id}`}
            >
              {item.label}
            </EuiTab>
          ))}
        </EuiTabs>
      </div>

      <div
        css={{
          flex: '1 1 auto',
          minHeight: 0,
          overflow: 'auto',
          padding: euiTheme.size.base,
        }}
      >
        {tab === 'general' ? (
          <>
            <EuiFormRow
              fullWidth
              compressed
              label={i18n.translate('workflows.settingsSurface.d.nameLabel', {
                defaultMessage: 'Workflow name',
              })}
            >
              <EuiFieldText
                fullWidth
                compressed
                value={draft.name}
                disabled={readOnly}
                onChange={(e) => draft.setName(e.target.value)}
                onBlur={handleNameBlur}
                data-test-subj="workflowSettingsDNameInput"
              />
            </EuiFormRow>
            <EuiSpacer size="m" />
            <EuiFormRow
              fullWidth
              compressed
              label={i18n.translate('workflows.settingsSurface.d.descriptionLabel', {
                defaultMessage: 'Description',
              })}
            >
              <EuiTextArea
                fullWidth
                compressed
                rows={6}
                value={draft.description}
                disabled={readOnly}
                onChange={(e) => draft.setDescription(e.target.value)}
                onBlur={handleDescriptionBlur}
                data-test-subj="workflowSettingsDDescriptionInput"
              />
            </EuiFormRow>
            <EuiSpacer size="m" />
            <EuiFormRow
              fullWidth
              compressed
              label={i18n.translate('workflows.settingsSurface.d.tagsLabel', {
                defaultMessage: 'Tags',
              })}
              helpText={i18n.translate('workflows.settingsSurface.d.tagsHelp', {
                defaultMessage: 'Words and phrases that help categorize this workflow.',
              })}
            >
              <EuiComboBox
                fullWidth
                compressed
                selectedOptions={tagOptions}
                onChange={(selected) => {
                  const next = selected.map((o) => o.label);
                  draft.setTags(next);
                  draft.applyYamlPatch({ tags: next });
                }}
                onCreateOption={(searchValue) => {
                  const normalized = searchValue.trim();
                  if (!normalized || draft.tags.includes(normalized)) return;
                  const next = [...draft.tags, normalized];
                  draft.setTags(next);
                  draft.applyYamlPatch({ tags: next });
                }}
                isDisabled={readOnly}
                data-test-subj="workflowSettingsDTagsInput"
              />
            </EuiFormRow>
            <EuiSpacer size="l" />
            <EuiText size="s" color="subdued" data-test-subj="workflowSettingsDInputsHint">
              <FormattedMessage
                id="workflows.settingsSurface.d.inputsOnManualHint"
                defaultMessage="Run inputs are defined on the Manual trigger on the canvas — not here."
              />
            </EuiText>
          </>
        ) : null}

        {tab === 'constants' ? (
          <WorkflowConstantsEditor
            fields={draft.constantFields}
            onChange={draft.handleConstantsChange}
            findReferencingSteps={draft.findConstRefs}
            readOnly={readOnly}
          />
        ) : null}

        {tab === 'outputs' ? (
          <WorkflowOutputsEditor
            fields={draft.outputFields}
            onChange={draft.handleOutputsChange}
            workflowDefinition={draft.definition}
            connectors={draft.connectors}
            findReferencingSteps={draft.findOutputRefs}
            readOnly={readOnly}
          />
        ) : null}
      </div>

      <div
        css={{
          flex: '0 0 auto',
          borderTop: `${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBaseSubdued}`,
          padding: euiTheme.size.base,
        }}
      >
        <EuiFlexGroup justifyContent="flexEnd" gutterSize="m" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose} data-test-subj="workflowSettingsDPanelCancel">
              {i18n.translate('workflows.settingsSurface.d.cancel', { defaultMessage: 'Cancel' })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton fill onClick={onClose} data-test-subj="workflowSettingsDPanelDone">
              {i18n.translate('workflows.settingsSurface.d.done', { defaultMessage: 'Done' })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    </div>
  );
}
