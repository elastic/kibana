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
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiImage,
  EuiMarkdownFormat,
  EuiNotificationBadge,
  EuiTab,
  EuiTabs,
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { getBaseConnectorType } from '@kbn/workflows-ui';
import {
  defaultPanelStyles,
  panelStyles,
  previewStepRowStyles,
  resourceCardStyles,
} from './actions_menu_preview_panel.styles';
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
  const styles = useMemoCss(defaultPanelStyles);
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
    <div css={styles.root}>
      <div css={styles.hero}>
        <EuiImage
          src={illustrationUrl ?? ''}
          alt=""
          css={styles.illustration}
          width={128}
          height={128}
        />
        <p css={styles.heroText}>
          <FormattedMessage
            id="workflows.actionsMenu.preview.selectStep"
            defaultMessage="Select a step to get started"
          />
          <br />
          <FormattedMessage
            id="workflows.actionsMenu.preview.selectStepDesc"
            defaultMessage="Choose an action from the list to see its description and configuration."
          />
        </p>
      </div>
      <div css={styles.cardsSection}>
        <ResourceCard
          title={i18n.translate('workflows.actionsMenu.preview.documentation', {
            defaultMessage: 'Documentation',
          })}
          description={i18n.translate('workflows.actionsMenu.preview.documentationDesc', {
            defaultMessage: 'Learn how workflows steps work',
          })}
          iconType="external"
          href={WORKFLOWS_DOCUMENTATION_URL}
        />
        <ResourceCard
          title={i18n.translate('workflows.actionsMenu.preview.downloadSchema', {
            defaultMessage: 'Download schema',
          })}
          description={i18n.translate('workflows.actionsMenu.preview.downloadSchemaDesc', {
            defaultMessage: 'Download the full JSON schema',
          })}
          iconType="download"
          onClick={handleDownloadSchema}
        />
      </div>
    </div>
  );
}
function ResourceCard({
  title,
  description,
  iconType,
  href,
  onClick,
}: {
  title: string;
  description: string;
  iconType: string;
  href?: string;
  onClick?: () => void;
}) {
  const styles = useMemoCss(resourceCardStyles);
  const content = (
    <EuiFlexGroup alignItems="center" gutterSize="none" justifyContent="spaceBetween">
      <EuiFlexItem>
        <EuiFlexGroup direction="column" gutterSize="none">
          <EuiFlexItem>
            <EuiText size="s">
              <strong>{title}</strong>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="xs" color="subdued">
              {description}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiIcon type={iconType} color="primary" size="m" aria-hidden />
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  if (href) {
    return (
      <a css={styles.row} href={href} target="_blank" rel="noopener noreferrer" aria-label={title}>
        {content}
      </a>
    );
  }

  return (
    <button type="button" css={styles.row} onClick={onClick} aria-label={title}>
      {content}
    </button>
  );
}

function JumpStepPanel({ entry }: { entry: JumpToStepEntry }) {
  const styles = useMemoCss(panelStyles);
  return (
    <div css={styles.panel}>
      <div css={styles.titleBlock}>
        <p css={styles.titleBlockText}>{entry.id}</p>
        <p css={styles.descriptionText}>
          <FormattedMessage
            id="workflows.actionsMenu.preview.jumpStep.subtitle"
            defaultMessage="Existing step in this workflow"
          />
        </p>
      </div>
      {entry.yaml && (
        <div css={styles.tabsAndFields}>
          <div css={styles.fieldList}>
            <div css={styles.yamlPreview}>
              <pre css={styles.codeText}>{entry.yaml}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
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
    <div css={styles.sectionPanel}>
      <div css={styles.sectionTitle}>
        <p css={styles.titleBlockText}>{section.label}</p>
        {section.description && <p css={styles.descriptionText}>{section.description}</p>}
      </div>
      <div css={styles.stepListScroll}>
        <div css={styles.stepList}>
          {steps.map((step) => (
            <PreviewStepRow
              key={step.id}
              step={step}
              onClick={() => onStepSelected(step)}
              onAdd={onAddStep ? () => onAddStep(step) : undefined}
              onPinPreview={onPinPreview ? () => onPinPreview(step, section) : undefined}
            />
          ))}
        </div>
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
  const displayTitle = step.label || step.id;
  const displayDescription =
    step.description && step.description !== step.id && step.description !== displayTitle
      ? step.description
      : null;

  return (
    <div css={styles.panel}>
      <div css={styles.titleBlock}>
        <p css={styles.titleBlockText}>{displayTitle}</p>
        {displayDescription && <p css={styles.descriptionText}>{displayDescription}</p>}
        <EuiFlexGroup alignItems="center" gutterSize="m" css={styles.detailActions}>
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
      </div>

      <div css={styles.tabsAndFields}>
        <EuiTabs size="s" css={styles.tabs}>
          <EuiTab isSelected={activeTab === 'inputs'} onClick={() => onTabChange('inputs')}>
            <FormattedMessage id="workflows.actionsMenu.preview.inputs" defaultMessage="Inputs" />
            {inputCount > 0 && (
              <EuiNotificationBadge color="subdued" size="m" css={styles.tabCount}>
                {inputCount}
              </EuiNotificationBadge>
            )}
          </EuiTab>
          <EuiTab isSelected={activeTab === 'outputs'} onClick={() => onTabChange('outputs')}>
            <FormattedMessage id="workflows.actionsMenu.preview.outputs" defaultMessage="Outputs" />
            {outputCount > 0 && (
              <EuiNotificationBadge color="subdued" size="m" css={styles.tabCount}>
                {outputCount}
              </EuiNotificationBadge>
            )}
          </EuiTab>
          <EuiTab isSelected={activeTab === 'examples'} onClick={() => onTabChange('examples')}>
            <FormattedMessage
              id="workflows.actionsMenu.preview.examples"
              defaultMessage="Examples"
            />
          </EuiTab>
        </EuiTabs>

        {activeTab === 'examples' ? (
          <div css={styles.fieldList}>
            {examples.length === 0 ? (
              <div css={styles.emptyFields}>
                <EuiText size="xs" color="subdued">
                  <FormattedMessage
                    id="workflows.actionsMenu.preview.noExamples"
                    defaultMessage="No examples available."
                  />
                </EuiText>
              </div>
            ) : (
              examples.map((example, idx) => (
                <div key={idx} css={styles.yamlPreview}>
                  <EuiMarkdownFormat textSize="xs">{example}</EuiMarkdownFormat>
                </div>
              ))
            )}
          </div>
        ) : (
          <div css={styles.fieldList}>
            {fields.length === 0 ? (
              <div css={styles.emptyFields}>
                <EuiText size="xs" color="subdued">
                  <FormattedMessage
                    id="workflows.actionsMenu.preview.noFields"
                    defaultMessage="No fields available."
                  />
                </EuiText>
              </div>
            ) : (
              fields.map((field, idx) => (
                <React.Fragment key={field.name}>
                  {idx > 0 && <div css={styles.fieldDivider} />}
                  <div css={styles.fieldRow}>
                    <div css={styles.fieldLabelRow}>
                      <EuiText size="xs" css={styles.fieldName}>
                        {field.name}
                      </EuiText>
                      <span css={styles.typeBadge}>{field.typeName}</span>
                      {field.required && (
                        <span css={styles.requiredBadge}>
                          <FormattedMessage
                            id="workflows.actionsMenu.preview.required"
                            defaultMessage="Required"
                          />
                        </span>
                      )}
                    </div>
                    {field.description && (
                      <EuiText size="xs" color="subdued" css={styles.fieldDescription}>
                        {field.description}
                      </EuiText>
                    )}
                  </div>
                </React.Fragment>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function getPreviewIconContainerStyle(
  step: ActionOptionData,
  styles: ReturnType<typeof useMemoCss<typeof previewStepRowStyles>>
) {
  const { iconVariant } = step;
  switch (iconVariant) {
    case 'trigger':
      return styles.iconContainerTrigger;
    case 'external':
    case 'neutral':
      return styles.iconContainerAppLogo;
    case 'flowControl':
      return styles.iconContainerFlowControl;
    case 'dataTransformation':
      return styles.iconContainerDataTransformation;
    case 'platform':
      return styles.iconContainerPlatform;
    case undefined:
      return styles.iconContainerPlatform;
    default: {
      const exhaustiveCheck: never = iconVariant;
      return exhaustiveCheck;
    }
  }
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
  const iconType = 'iconType' in step ? step.iconType : undefined;
  const glyphColor =
    getIconGlyphColor(step.iconVariant, euiTheme) ??
    ('iconColor' in step ? step.iconColor : undefined);
  const preferMenuIcon =
    iconType === 'sparkles' || iconType === 'database' || iconType === 'branch';
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
        <span css={[styles.iconContainer, getPreviewIconContainerStyle(step, styles)]}>
          {preferMenuIcon && iconType === 'sparkles' ? (
            <ActionsMenuAiIcon />
          ) : preferMenuIcon && iconType ? (
            <EuiIcon type={iconType} size="m" color={glyphColor} aria-hidden />
          ) : isActionConnectorGroup(step) || isActionConnectorOption(step) ? (
            <StepIcon
              stepType={getBaseConnectorType(step.connectorType)}
              executionStatus={undefined}
            />
          ) : isActionGroup(step) || isActionOption(step) ? (
            step.iconType === 'sparkles' ? (
              <ActionsMenuAiIcon />
            ) : (
              <EuiIcon type={step.iconType} size="m" color={glyphColor} aria-hidden />
            )
          ) : null}
        </span>
        <span css={styles.info}>
          <span css={styles.labelText}>{step.label}</span>
          {step.description && (
            <EuiText size="xs" color="subdued" css={styles.description}>
              {step.description}
            </EuiText>
          )}
        </span>
        {isGroup && (
          <EuiIcon
            type="chevronSingleRight"
            size="s"
            color="subdued"
            aria-hidden
            css={styles.chevron}
          />
        )}
      </button>
      {showLeafActions && (
        <span className="rowActions" css={styles.rowActions}>
          {onPinPreview && (
            <EuiToolTip content={viewDetailsLabel} disableScreenReaderOutput>
              <EuiButtonIcon
                iconType="info"
                size="m"
                iconSize="m"
                color="text"
                display="empty"
                css={styles.rowActionButton}
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
                size="m"
                iconSize="m"
                color="text"
                display="base"
                css={styles.rowActionButton}
                aria-label={addStepLabel}
                data-test-subj="actionsMenuPreviewItemAdd"
                onClick={onAdd}
              />
            </EuiToolTip>
          )}
        </span>
      )}
    </div>
  );
}
