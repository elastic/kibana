/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCode,
  EuiCodeBlock,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiImage,
  EuiLink,
  EuiMarkdownFormat,
  EuiNotificationBadge,
  EuiPanel,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiFontSize,
  useEuiTheme,
} from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { getBaseConnectorType } from '@kbn/workflows-ui';
import { getActionIconTileVariantStyle } from './action_icon_tile.styles';
import { panelStyles, previewStepRowStyles } from './actions_menu_preview_panel.styles';
import { ActionsMenuAiIcon } from './ai_icon_tile';
import { WORKFLOWS_DOCUMENTATION_URL } from '../../../../common';
import { useKibana } from '../../../hooks/use_kibana';
import { StepIcon } from '../../../shared/ui/step_icons/step_icon';
import { useWorkflowJsonSchema } from '../../validate_workflow_yaml/model/use_workflow_json_schema';
import { getIconGlyphColor } from '../lib/get_action_options';
import { getStepPreviewData } from '../lib/get_step_preview_data';
import { getFieldsFromZodSchema } from '../lib/get_step_preview_fields';
import type { ActionOptionData, JumpToStepEntry } from '../types';
import {
  isActionConnectorGroup,
  isActionConnectorOption,
  isActionGroup,
  isActionOption,
} from '../types';

type TabId = 'inputs' | 'outputs' | 'examples';

interface ActionsMenuPreviewPanelProps {
  hoveredOption: ActionOptionData | null;
  hoveredJumpEntry?: JumpToStepEntry | null;
  onStepSelected: (action: ActionOptionData) => void;
  onAddStep?: (action: ActionOptionData) => void;
  onPinPreview?: (action: ActionOptionData, parentSection?: ActionOptionData) => void;
}

export function ActionsMenuPreviewPanel({
  hoveredOption,
  hoveredJumpEntry,
  onStepSelected,
  onAddStep,
  onPinPreview,
}: ActionsMenuPreviewPanelProps) {
  const styles = useMemoCss(panelStyles);
  const [activeTab, setActiveTab] = useState<TabId>('inputs');

  const isGroup = hoveredOption
    ? isActionGroup(hoveredOption) || isActionConnectorGroup(hoveredOption)
    : false;
  const isLeaf = hoveredOption ? !isGroup : false;

  const previewData = useMemo(() => {
    if (!hoveredOption || !isLeaf) return undefined;
    return getStepPreviewData(hoveredOption.id);
  }, [hoveredOption, isLeaf]);

  const inputFields = useMemo(
    () => getFieldsFromZodSchema(previewData?.inputSchema),
    [previewData]
  );
  const outputFields = useMemo(
    () => getFieldsFromZodSchema(previewData?.outputSchema),
    [previewData]
  );
  const examples = previewData?.examples ?? [];
  const docUrl = previewData?.documentationUrl;

  const fields = activeTab === 'inputs' ? inputFields : outputFields;

  if (!hoveredOption) {
    if (hoveredJumpEntry) {
      return <JumpStepPanel entry={hoveredJumpEntry} />;
    }
    return <DefaultPanel />;
  }

  if (isGroup) {
    return (
      <SectionPreviewPanel
        section={hoveredOption}
        onStepSelected={onStepSelected}
        onAddStep={onAddStep}
        onPinPreview={onPinPreview}
        styles={styles}
      />
    );
  }

  return (
    <StepDetailPanel
      step={hoveredOption}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      fields={fields}
      inputCount={inputFields.length}
      outputCount={outputFields.length}
      examples={examples}
      docUrl={docUrl}
      onAdd={() => onAddStep?.(hoveredOption)}
      styles={styles}
    />
  );
}

function DefaultPanel() {
  const styles = useMemoCss(panelStyles);
  const { http, notifications } = useKibana().services;
  const { jsonSchema } = useWorkflowJsonSchema({ loose: false });
  const illustrationUrl = http?.basePath.prepend(
    '/plugins/workflowsManagement/assets/illustration_hand_touch.svg'
  );

  const handleDownloadSchema = useCallback(() => {
    try {
      const blob = new Blob([JSON.stringify(jsonSchema, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'workflow-schema.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.setTimeout(() => URL.revokeObjectURL(url));
    } catch (error) {
      notifications?.toasts.addError(error as Error, {
        title: i18n.translate('workflows.actionsMenu.preview.downloadSchemaError', {
          defaultMessage: 'Failed to download schema',
        }),
      });
    }
  }, [jsonSchema, notifications]);

  return (
    <EuiFlexGroup direction="column" gutterSize="none" css={styles.fill} responsive={false}>
      <EuiFlexItem>
        <EuiEmptyPrompt
          paddingSize="m"
          icon={<EuiImage src={illustrationUrl ?? ''} alt="" width={128} height={128} />}
          title={
            <h3>
              <FormattedMessage
                id="workflows.actionsMenu.preview.selectStep"
                defaultMessage="Select a step to get started"
              />
            </h3>
          }
          titleSize="xs"
          body={
            <EuiText size="s" color="subdued">
              <FormattedMessage
                id="workflows.actionsMenu.preview.selectStepDesc"
                defaultMessage="Choose an action from the list to see its description and configuration."
              />
            </EuiText>
          }
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiPanel
          hasBorder
          hasShadow={false}
          paddingSize="none"
          borderRadius="m"
          css={styles.resourceInset}
        >
          <EuiLink
            href={WORKFLOWS_DOCUMENTATION_URL}
            target="_blank"
            external={false}
            css={styles.resourceRow}
            aria-label={i18n.translate('workflows.actionsMenu.preview.documentation', {
              defaultMessage: 'Documentation',
            })}
          >
            <EuiFlexGroup alignItems="center" gutterSize="none" justifyContent="spaceBetween">
              <EuiFlexItem>
                <EuiText size="s">
                  <strong>
                    {i18n.translate('workflows.actionsMenu.preview.documentation', {
                      defaultMessage: 'Documentation',
                    })}
                  </strong>
                </EuiText>
                <EuiText size="xs" color="subdued">
                  {i18n.translate('workflows.actionsMenu.preview.documentationDesc', {
                    defaultMessage: 'Learn how workflows steps work',
                  })}
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiIcon type="external" color="subdued" size="m" aria-hidden />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiLink>
          <EuiHorizontalRule margin="none" />
          <button
            type="button"
            onClick={handleDownloadSchema}
            css={styles.resourceRow}
            aria-label={i18n.translate('workflows.actionsMenu.preview.downloadSchema', {
              defaultMessage: 'Download schema',
            })}
          >
            <EuiFlexGroup alignItems="center" gutterSize="none" justifyContent="spaceBetween">
              <EuiFlexItem>
                <EuiText size="s">
                  <strong>
                    {i18n.translate('workflows.actionsMenu.preview.downloadSchema', {
                      defaultMessage: 'Download schema',
                    })}
                  </strong>
                </EuiText>
                <EuiText size="xs" color="subdued">
                  {i18n.translate('workflows.actionsMenu.preview.downloadSchemaDesc', {
                    defaultMessage: 'Download the full JSON schema',
                  })}
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiIcon type="download" color="primary" size="m" aria-hidden />
              </EuiFlexItem>
            </EuiFlexGroup>
          </button>
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

function JumpStepPanel({ entry }: { entry: JumpToStepEntry }) {
  const styles = useMemoCss(panelStyles);
  return (
    <EuiPanel
      hasShadow={false}
      hasBorder={false}
      paddingSize="m"
      color="transparent"
      css={styles.scroll}
    >
      <EuiTitle size="xs">
        <h3>{entry.id}</h3>
      </EuiTitle>
      <EuiSpacer size="xs" />
      <EuiText size="xs" color="subdued">
        <FormattedMessage
          id="workflows.actionsMenu.preview.jumpStep.subtitle"
          defaultMessage="Existing step in this workflow"
        />
      </EuiText>
      {entry.yaml && (
        <>
          <EuiSpacer size="m" />
          <EuiPanel hasBorder hasShadow={false} paddingSize="none" borderRadius="m">
            <EuiCodeBlock language="yaml" fontSize="s" paddingSize="m" isCopyable={false}>
              {entry.yaml}
            </EuiCodeBlock>
          </EuiPanel>
        </>
      )}
    </EuiPanel>
  );
}

function SectionPreviewPanel({
  section,
  onStepSelected,
  onAddStep,
  onPinPreview,
  styles,
}: {
  section: ActionOptionData;
  onStepSelected: (action: ActionOptionData) => void;
  onAddStep?: (action: ActionOptionData) => void;
  onPinPreview?: (action: ActionOptionData, parentSection?: ActionOptionData) => void;
  styles: ReturnType<typeof useMemoCss<typeof panelStyles>>;
}) {
  const steps = useMemo(() => {
    const raw = isActionGroup(section)
      ? section.options
      : isActionConnectorGroup(section)
      ? section.options
      : [];
    return [...raw].sort((a, b) =>
      a.label.localeCompare(b.label, undefined, { sensitivity: 'base', numeric: true })
    );
  }, [section]);

  return (
    <div css={styles.fill}>
      <div css={styles.sectionHeader}>
        <EuiTitle size="xs">
          <h3>{section.label}</h3>
        </EuiTitle>
        {section.description && (
          <>
            <EuiSpacer size="xs" />
            <EuiText size="xs" color="subdued">
              {section.description}
            </EuiText>
          </>
        )}
      </div>
      <div css={styles.stepListScroll}>
        <EuiPanel
          hasBorder
          hasShadow={false}
          paddingSize="none"
          borderRadius="m"
          css={styles.stepListPanel}
        >
          {steps.map((step) => (
            <PreviewStepRow
              key={step.id}
              step={step}
              onClick={() => onStepSelected(step)}
              onAdd={onAddStep ? () => onAddStep(step) : undefined}
              onPinPreview={onPinPreview ? () => onPinPreview(step, section) : undefined}
            />
          ))}
        </EuiPanel>
      </div>
    </div>
  );
}

function StepDetailPanel({
  step,
  activeTab,
  onTabChange,
  fields,
  inputCount,
  outputCount,
  examples,
  docUrl,
  onAdd,
  styles,
}: {
  step: ActionOptionData;
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  fields: ReturnType<typeof getFieldsFromZodSchema>;
  inputCount: number;
  outputCount: number;
  examples: string[];
  docUrl?: string;
  onAdd: () => void;
  styles: ReturnType<typeof useMemoCss<typeof panelStyles>>;
}) {
  const requiredFont = useEuiFontSize('xxs');
  const displayTitle = step.label || step.id;
  const displayDescription =
    step.description && step.description !== step.id && step.description !== displayTitle
      ? step.description
      : null;

  return (
    <EuiPanel
      hasShadow={false}
      hasBorder={false}
      paddingSize="m"
      color="transparent"
      css={styles.scroll}
    >
      <EuiTitle size="xxs">
        <h3>{displayTitle}</h3>
      </EuiTitle>
      {displayDescription && (
        <>
          <EuiSpacer size="xs" />
          <EuiText size="xs" color="subdued">
            {displayDescription}
          </EuiText>
        </>
      )}
      <EuiSpacer size="s" />
      <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="xs"
            iconType="plus"
            flush="left"
            onClick={onAdd}
            data-test-subj="actionsMenuPreviewAdd"
          >
            <FormattedMessage id="workflows.actionsMenu.preview.add" defaultMessage="Add" />
          </EuiButtonEmpty>
        </EuiFlexItem>
        {docUrl && (
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="xs"
              href={docUrl}
              target="_blank"
              iconType="external"
              iconSide="right"
              flush="left"
              data-test-subj="actionsMenuPreviewDocumentation"
            >
              <FormattedMessage
                id="workflows.actionsMenu.preview.documentationLink"
                defaultMessage="Documentation"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>

      <EuiSpacer size="m" />
      <EuiTabs size="s">
        <EuiTab isSelected={activeTab === 'inputs'} onClick={() => onTabChange('inputs')}>
          <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
            <EuiFlexItem grow={false}>
              <FormattedMessage id="workflows.actionsMenu.preview.inputs" defaultMessage="Inputs" />
            </EuiFlexItem>
            {inputCount > 0 && (
              <EuiFlexItem grow={false}>
                <EuiNotificationBadge color="subdued" size="m">
                  {inputCount}
                </EuiNotificationBadge>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiTab>
        <EuiTab isSelected={activeTab === 'outputs'} onClick={() => onTabChange('outputs')}>
          <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
            <EuiFlexItem grow={false}>
              <FormattedMessage
                id="workflows.actionsMenu.preview.outputs"
                defaultMessage="Outputs"
              />
            </EuiFlexItem>
            {outputCount > 0 && (
              <EuiFlexItem grow={false}>
                <EuiNotificationBadge color="subdued" size="m">
                  {outputCount}
                </EuiNotificationBadge>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiTab>
        <EuiTab isSelected={activeTab === 'examples'} onClick={() => onTabChange('examples')}>
          <FormattedMessage id="workflows.actionsMenu.preview.examples" defaultMessage="Examples" />
        </EuiTab>
      </EuiTabs>

      <EuiSpacer size="s" />
      <EuiPanel hasBorder hasShadow={false} paddingSize="none" borderRadius="m">
        {activeTab === 'examples' ? (
          examples.length === 0 ? (
            <EuiPanel hasShadow={false} paddingSize="m" color="transparent">
              <EuiText size="xs" color="subdued">
                <FormattedMessage
                  id="workflows.actionsMenu.preview.noExamples"
                  defaultMessage="No examples available."
                />
              </EuiText>
            </EuiPanel>
          ) : (
            examples.map((example, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && <EuiHorizontalRule margin="none" />}
                <EuiPanel hasShadow={false} paddingSize="m" color="transparent">
                  <EuiMarkdownFormat textSize="xs">{example}</EuiMarkdownFormat>
                </EuiPanel>
              </React.Fragment>
            ))
          )
        ) : fields.length === 0 ? (
          <EuiPanel hasShadow={false} paddingSize="m" color="transparent">
            <EuiText size="xs" color="subdued">
              <FormattedMessage
                id="workflows.actionsMenu.preview.noFields"
                defaultMessage="No fields available."
              />
            </EuiText>
          </EuiPanel>
        ) : (
          fields.map((field, idx) => (
            <React.Fragment key={field.name}>
              {idx > 0 && <EuiHorizontalRule margin="none" />}
              <EuiPanel hasShadow={false} paddingSize="m" color="transparent">
                <EuiFlexGroup
                  alignItems="center"
                  justifyContent="spaceBetween"
                  gutterSize="s"
                  responsive={false}
                >
                  <EuiFlexItem grow={false}>
                    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                      <EuiFlexItem grow={false}>
                        <EuiText size="xs">
                          <strong>{field.name}</strong>
                        </EuiText>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiText size="xs">
                          <EuiCode>{field.typeName}</EuiCode>
                        </EuiText>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiFlexItem>
                  {field.required && (
                    <EuiFlexItem grow={false}>
                      <EuiText color="danger" css={requiredFont}>
                        <FormattedMessage
                          id="workflows.actionsMenu.preview.required"
                          defaultMessage="Required"
                        />
                      </EuiText>
                    </EuiFlexItem>
                  )}
                </EuiFlexGroup>
                {field.description && (
                  <>
                    <EuiSpacer size="xs" />
                    <EuiText size="xs" color="subdued" className="eui-textTruncate">
                      {field.description}
                    </EuiText>
                  </>
                )}
              </EuiPanel>
            </React.Fragment>
          ))
        )}
      </EuiPanel>
    </EuiPanel>
  );
}

function PreviewStepIcon({
  step,
  glyphColor,
}: {
  step: ActionOptionData;
  glyphColor: string | undefined;
}): React.ReactNode {
  const iconType = 'iconType' in step ? step.iconType : undefined;

  if (iconType === 'sparkles') {
    return <ActionsMenuAiIcon />;
  }
  if (iconType === 'database' || iconType === 'branch') {
    return <EuiIcon type={iconType} size="m" color={glyphColor} aria-hidden />;
  }
  if (isActionConnectorGroup(step) || isActionConnectorOption(step)) {
    return (
      <StepIcon stepType={getBaseConnectorType(step.connectorType)} executionStatus={undefined} />
    );
  }
  if (isActionGroup(step) || isActionOption(step)) {
    return <EuiIcon type={step.iconType} size="m" color={glyphColor} aria-hidden />;
  }
  return null;
}

function PreviewStepRow({
  step,
  onClick,
  onAdd,
  onPinPreview,
}: {
  step: ActionOptionData;
  onClick: () => void;
  onAdd?: () => void;
  onPinPreview?: () => void;
}) {
  const styles = useMemoCss(previewStepRowStyles);
  const { euiTheme } = useEuiTheme();
  const isGroup = isActionGroup(step) || isActionConnectorGroup(step);
  const glyphColor =
    getIconGlyphColor(step.iconVariant, euiTheme) ??
    ('iconColor' in step ? step.iconColor : undefined);
  const showLeafActions = !isGroup && (onAdd || onPinPreview);
  const viewDetailsLabel = i18n.translate('workflows.actionsMenu.viewDetails', {
    defaultMessage: 'View details',
  });
  const addStepLabel = i18n.translate('workflows.actionsMenu.addStep', {
    defaultMessage: 'Add step',
  });

  return (
    <div css={styles.row}>
      <button type="button" css={styles.rowMain} onClick={onClick}>
        <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
          <EuiFlexItem grow={false}>
            <span css={[styles.tile, getActionIconTileVariantStyle(step.iconVariant, styles)]}>
              <PreviewStepIcon step={step} glyphColor={glyphColor} />
            </span>
          </EuiFlexItem>
          <EuiFlexItem grow css={styles.truncate}>
            <EuiText size="xs" className="eui-textTruncate">
              <strong>{step.label}</strong>
            </EuiText>
            {step.description && (
              <EuiText size="xs" color="subdued" className="eui-textTruncate">
                {step.description}
              </EuiText>
            )}
          </EuiFlexItem>
          {isGroup && (
            <EuiFlexItem grow={false}>
              <EuiIcon type="chevronSingleRight" size="s" color="subdued" aria-hidden />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </button>
      {showLeafActions && (
        <div data-row-actions="" css={styles.rowActions}>
          {onPinPreview && (
            <EuiToolTip content={viewDetailsLabel} disableScreenReaderOutput>
              <EuiButtonIcon
                iconType="info"
                size="s"
                iconSize="m"
                color="text"
                display="empty"
                aria-label={viewDetailsLabel}
                data-test-subj="actionsMenuPreviewItemInfo"
                onClick={onPinPreview}
              />
            </EuiToolTip>
          )}
          {onAdd && (
            <EuiToolTip content={addStepLabel} disableScreenReaderOutput>
              <EuiButtonIcon
                iconType="plusCircle"
                size="s"
                iconSize="m"
                color="text"
                display="base"
                aria-label={addStepLabel}
                data-test-subj="actionsMenuPreviewItemAdd"
                onClick={onAdd}
              />
            </EuiToolTip>
          )}
        </div>
      )}
    </div>
  );
}
