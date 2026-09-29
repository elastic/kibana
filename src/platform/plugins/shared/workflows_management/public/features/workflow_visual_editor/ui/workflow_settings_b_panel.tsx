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
  EuiCodeBlock,
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
import { ensureWorkflowGraphEuiIcons } from '@kbn/workflows-ui';
import { useWorkflowSettingsDraft } from './use_workflow_settings_draft';
import { WorkflowConstantsEditor } from '../../../pages/workflow_detail/ui/workflow_constants_editor';
import { WorkflowOutputsEditor } from '../../../pages/workflow_detail/ui/workflow_outputs_editor';

ensureWorkflowGraphEuiIcons();

export type WorkflowSettingsBPanelKind = 'info' | 'constants' | 'outputs';

export interface WorkflowSettingsBPanelProps {
  readonly kind: WorkflowSettingsBPanelKind;
  readonly readOnly?: boolean;
  readonly onClose: () => void;
}

type EditorTab = 'form' | 'yaml';

const KIND_META: Record<WorkflowSettingsBPanelKind, { title: string; iconType: string }> = {
  info: {
    title: i18n.translate('workflows.settingsSurface.b.infoTitle', {
      defaultMessage: 'Workflow info',
    }),
    iconType: 'info',
  },
  constants: {
    title: i18n.translate('workflows.settingsSurface.b.constantsTitle', {
      defaultMessage: 'Constants',
    }),
    iconType: 'code',
  },
  outputs: {
    title: i18n.translate('workflows.settingsSurface.b.outputsTitle', {
      defaultMessage: 'Outputs',
    }),
    iconType: 'share',
  },
};

/**
 * Body for Option B docked settings panels. Mounted inside the same
 * {@link CanvasConfigPanelShell} used by step/trigger config — not a separate
 * floating-panel system.
 */
export function WorkflowSettingsBPanel({
  kind,
  readOnly = false,
  onClose,
}: WorkflowSettingsBPanelProps) {
  const { euiTheme } = useEuiTheme();
  const titleId = useGeneratedHtmlId({ prefix: 'workflowSettingsBPanel' });
  const [tab, setTab] = useState<EditorTab>('form');
  const meta = KIND_META[kind];

  const draft = useWorkflowSettingsDraft({ hydrateKey: kind, readOnly });

  const tagOptions = useMemo(
    (): Array<EuiComboBoxOptionOption<string>> => draft.tags.map((label) => ({ label })),
    [draft.tags]
  );

  const closeLabel = i18n.translate('workflows.settingsSurface.b.close', {
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
      data-test-subj={`workflowSettingsBPanel-${kind}`}
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
            // No bottom padding — tabs sit flush under the title row.
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
              // Match settings / step node icon chips in the visual builder.
              border: `1px solid ${euiTheme.colors.borderBaseSubdued}`,
              background: euiTheme.colors.backgroundBaseSubdued,
            }}
          >
            <EuiIcon type={meta.iconType} color="text" aria-hidden={true} />
          </span>
          <EuiTitle size="xxs">
            <h2 id={titleId} css={{ margin: 0 }}>
              {meta.title}
            </h2>
          </EuiTitle>
        </div>
        <EuiToolTip content={closeLabel} disableScreenReaderOutput>
          <EuiButtonIcon
            iconType="cross"
            color="text"
            aria-label={closeLabel}
            onClick={onClose}
            data-test-subj="workflowSettingsBPanelClose"
            css={{
              position: 'absolute',
              top: euiTheme.size.s,
              right: euiTheme.size.s,
              zIndex: 1,
            }}
          />
        </EuiToolTip>
        {kind !== 'info' ? (
          <EuiTabs
            size="s"
            bottomBorder={false}
            css={{ paddingInline: euiTheme.size.base, marginBlockStart: 0 }}
          >
            <EuiTab
              isSelected={tab === 'form'}
              onClick={() => setTab('form')}
              data-test-subj="workflowSettingsBPanelView-form"
            >
              {i18n.translate('workflows.settingsSurface.b.visualTab', {
                defaultMessage: 'Visual builder',
              })}
            </EuiTab>
            <EuiTab
              isSelected={tab === 'yaml'}
              onClick={() => setTab('yaml')}
              data-test-subj="workflowSettingsBPanelView-yaml"
            >
              {i18n.translate('workflows.settingsSurface.b.yamlTab', {
                defaultMessage: 'YAML',
              })}
            </EuiTab>
          </EuiTabs>
        ) : null}
      </div>

      <div
        css={{
          flex: '1 1 auto',
          minHeight: 0,
          overflow: 'auto',
          padding: euiTheme.size.base,
        }}
      >
        {kind === 'info' ? (
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
                value={draft.name}
                disabled={readOnly}
                onChange={(e) => draft.setName(e.target.value)}
                onBlur={handleNameBlur}
                data-test-subj="workflowSettingsBNameInput"
              />
            </EuiFormRow>
            <EuiSpacer size="m" />
            <EuiFormRow
              fullWidth
              compressed
              label={i18n.translate('workflows.workflowSettingsFlyout.descriptionLabel', {
                defaultMessage: 'Description',
              })}
              helpText={i18n.translate('workflows.settingsSurface.b.descriptionHelp', {
                defaultMessage: 'Shown in the workflow list and in the collapsed settings surface.',
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
                data-test-subj="workflowSettingsBDescriptionInput"
              />
            </EuiFormRow>
            <EuiSpacer size="m" />
            <EuiFormRow
              fullWidth
              compressed
              label={i18n.translate('workflows.workflowSettingsFlyout.tagsLabel', {
                defaultMessage: 'Tags',
              })}
              helpText={i18n.translate('workflows.settingsSurface.b.tagsHelp', {
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
                data-test-subj="workflowSettingsBTagsInput"
              />
            </EuiFormRow>
          </>
        ) : null}

        {kind === 'constants' && tab === 'form' ? (
          <WorkflowConstantsEditor
            fields={draft.constantFields}
            onChange={draft.handleConstantsChange}
            findReferencingSteps={draft.findConstRefs}
            readOnly={readOnly}
          />
        ) : null}

        {kind === 'constants' && tab === 'yaml' ? (
          <EuiCodeBlock
            language="yaml"
            isCopyable
            paddingSize="m"
            data-test-subj="workflowSettingsBConstsYaml"
          >
            {draft.constsYaml || 'consts: {}'}
          </EuiCodeBlock>
        ) : null}

        {kind === 'outputs' && tab === 'form' ? (
          <WorkflowOutputsEditor
            fields={draft.outputFields}
            onChange={draft.handleOutputsChange}
            workflowDefinition={draft.definition}
            connectors={draft.connectors}
            findReferencingSteps={draft.findOutputRefs}
            readOnly={readOnly}
          />
        ) : null}

        {kind === 'outputs' && tab === 'yaml' ? (
          <>
            <EuiText size="xs" color="subdued">
              {i18n.translate('workflows.settingsSurface.b.outputsYamlProvisional', {
                defaultMessage: 'Outputs YAML shape is provisional pending the YAML spec RFC.',
              })}
            </EuiText>
            <EuiSpacer size="s" />
            <EuiCodeBlock
              language="yaml"
              isCopyable
              paddingSize="m"
              data-test-subj="workflowSettingsBOutputsYaml"
            >
              {draft.outputsYaml || 'outputs: {}'}
            </EuiCodeBlock>
          </>
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
            <EuiButtonEmpty onClick={onClose} data-test-subj="workflowSettingsBPanelCancel">
              {i18n.translate('workflows.settingsSurface.b.cancel', { defaultMessage: 'Cancel' })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton fill onClick={onClose} data-test-subj="workflowSettingsBPanelDone">
              {i18n.translate('workflows.settingsSurface.b.done', { defaultMessage: 'Done' })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    </div>
  );
}
