/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UseEuiTheme } from '@elastic/eui';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiImage,
  EuiLink,
  EuiNotificationBadge,
  EuiTab,
  EuiTabs,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useMemo, useState } from 'react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { getBaseConnectorType } from '@kbn/workflows-ui';
import { WORKFLOWS_DOCUMENTATION_URL } from '../../../../common';
import { stepSchemas } from '../../../../common/step_schemas';
import { useKibana } from '../../../hooks/use_kibana';
import { StepIcon } from '../../../shared/ui/step_icons/step_icon';
import { useWorkflowJsonSchema } from '../../validate_workflow_yaml/model/use_workflow_json_schema';
import { usesInverseIconColor } from '../lib/get_action_options';
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
  /** Pin step detail; when `parentSection` is set, also navigate left into that category. */
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

  const stepDef = useMemo(() => {
    if (!hoveredOption || !isLeaf) return undefined;
    return stepSchemas.getStepDefinition(hoveredOption.id);
  }, [hoveredOption, isLeaf]);

  const connectorDef = useMemo(() => {
    if (!hoveredOption || !isLeaf || stepDef) return undefined;
    return stepSchemas.getAllConnectorsMapCache()?.get(hoveredOption.id);
  }, [hoveredOption, isLeaf, stepDef]);

  const inputFields = useMemo(() => {
    const schema =
      (stepDef as { inputSchema?: Parameters<typeof getFieldsFromZodSchema>[0] } | undefined)
        ?.inputSchema ??
      (connectorDef as { paramsSchema?: Parameters<typeof getFieldsFromZodSchema>[0] } | undefined)
        ?.paramsSchema;
    return getFieldsFromZodSchema(schema);
  }, [stepDef, connectorDef]);

  const outputFields = useMemo(() => {
    const schema =
      (stepDef as { outputSchema?: Parameters<typeof getFieldsFromZodSchema>[0] } | undefined)
        ?.outputSchema ??
      (connectorDef as { outputSchema?: Parameters<typeof getFieldsFromZodSchema>[0] } | undefined)
        ?.outputSchema;
    return getFieldsFromZodSchema(schema);
  }, [stepDef, connectorDef]);

  const examples: string[] = useMemo(() => {
    return (
      (stepDef as { documentation?: { examples?: string[] } } | undefined)?.documentation
        ?.examples ?? []
    );
  }, [stepDef]);

  const docUrl =
    (connectorDef as { documentation?: string | null } | undefined)?.documentation ?? undefined;

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

/* ── Default state ── */

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
      URL.revokeObjectURL(url);
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
          iconType="popout"
          href={WORKFLOWS_DOCUMENTATION_URL}
        />
        <ResourceCard
          title={i18n.translate('workflows.actionsMenu.preview.downloadSchema', {
            defaultMessage: 'Download schema',
          })}
          description={i18n.translate('workflows.actionsMenu.preview.downloadSchemaDesc', {
            defaultMessage: 'Schema the full JSON schema',
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

/* ── Jump step YAML preview ── */

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

/* ── Section preview ── */

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

/* ── Step detail ── */

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
              <EuiLink href={docUrl} target="_blank" external>
                <FormattedMessage
                  id="workflows.actionsMenu.preview.documentationLink"
                  defaultMessage="Documentation"
                />
              </EuiLink>
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
                  <pre css={styles.codeText}>{example}</pre>
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

/* ── Step row (used in section preview) ── */

function getPreviewIconContainerStyle(
  step: ActionOptionData,
  styles: ReturnType<typeof useMemoCss<typeof previewStepRowStyles>>
) {
  switch (step.iconVariant) {
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
    default:
      return styles.iconContainerPlatform;
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
  const glyphColor = usesInverseIconColor(step.iconVariant)
    ? euiTheme.colors.textInverse
    : 'iconColor' in step
    ? step.iconColor
    : undefined;
  // Menu may override connector glyphs (e.g. AI → sparkles)
  const preferMenuIcon =
    iconType === 'sparkles' || iconType === 'database' || iconType === 'branch';
  const showLeafActions = !isGroup && (onAdd || onPinPreview);

  return (
    <button type="button" css={styles.row} onClick={onClick}>
      <span css={[styles.iconContainer, getPreviewIconContainerStyle(step, styles)]}>
        {preferMenuIcon && iconType ? (
          <EuiIcon type={iconType} size="m" color={glyphColor} aria-hidden />
        ) : isActionConnectorGroup(step) || isActionConnectorOption(step) ? (
          <StepIcon
            stepType={getBaseConnectorType(step.connectorType)}
            executionStatus={undefined}
          />
        ) : isActionGroup(step) || isActionOption(step) ? (
          <EuiIcon type={step.iconType} size="m" color={glyphColor} aria-hidden />
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
        <EuiIcon type="arrowRight" size="s" color="subdued" aria-hidden css={styles.chevron} />
      )}
      {showLeafActions && (
        <span className="rowActions" css={styles.rowActions}>
          {onPinPreview && (
            <EuiButtonIcon
              iconType="info"
              size="m"
              iconSize="m"
              color="text"
              display="empty"
              css={styles.rowActionButton}
              aria-label={i18n.translate('workflows.actionsMenu.viewDetails', {
                defaultMessage: 'View details',
              })}
              data-test-subj="actionsMenuPreviewItemInfo"
              onClick={(e: React.MouseEvent) => {
                e.preventDefault();
                e.stopPropagation();
                onPinPreview();
              }}
              onMouseDown={(e: React.MouseEvent) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            />
          )}
          {onAdd && (
            <EuiButtonIcon
              iconType="plusInCircle"
              size="m"
              iconSize="m"
              color="text"
              display="empty"
              css={styles.rowActionButton}
              aria-label={i18n.translate('workflows.actionsMenu.addStep', {
                defaultMessage: 'Add step',
              })}
              data-test-subj="actionsMenuPreviewItemAdd"
              onClick={(e: React.MouseEvent) => {
                e.preventDefault();
                e.stopPropagation();
                onAdd();
              }}
              onMouseDown={(e: React.MouseEvent) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            />
          )}
        </span>
      )}
    </button>
  );
}

/* ── Styles ── */

const panelStyles = {
  // Category preview: title stays put; list scrolls with scrollbar flush to panel edge
  sectionPanel: css({
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflow: 'hidden',
    paddingTop: '12px',
    gap: '16px',
  }),
  sectionTitle: css({
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    padding: '0 16px',
  }),
  stepListScroll: css({
    flex: 1,
    minHeight: 0,
    overflowY: 'auto',
    // Left/bottom inset for the card; no right padding so the scrollbar
    // sits flush against the right panel edge.
    padding: '0 0 16px 16px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
  }),
  // Figma: Frame 8 steps list — r=8, connected rows with outer card border.
  // Sizes to content; scroll appears on stepListScroll when it overflows.
  // overflow:hidden keeps row backgrounds clipped to the card radius.
  stepList: ({ euiTheme }: UseEuiTheme) =>
    css({
      flex: '0 0 auto',
      alignSelf: 'flex-start',
      boxSizing: 'border-box',
      // Full width minus the flush-scrollbar gutter
      width: 'calc(100% - 16px)',
      borderRadius: euiTheme.border.radius.medium,
      border: `1px solid ${euiTheme.colors.borderBaseSubdued}`,
      backgroundColor: euiTheme.colors.backgroundBasePlain,
      overflow: 'hidden',
    }),
  // Figma: Info frame — bg=gray, r=4, pad=[16,24,24,24], gap=16
  panel: ({ euiTheme }: UseEuiTheme) =>
    css({
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflowY: 'auto',
      borderRadius: '4px',
      padding: `12px 16px 16px 16px`,
      gap: euiTheme.size.base,
    }),
  titleBlock: css({
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  }),
  // Borealis: semiBold token is 500; 600 (`bold`) is the visible semibold weight
  titleBlockText: ({ euiTheme }: UseEuiTheme) =>
    css({
      fontSize: '14px',
      fontWeight: euiTheme.font.weight.bold,
      lineHeight: '24px',
      color: euiTheme.colors.textParagraph,
      margin: 0,
    }),
  detailActions: css({
    marginTop: '2px',
  }),
  descriptionText: ({ euiTheme }: UseEuiTheme) =>
    css({
      fontSize: '12px',
      fontWeight: 400,
      lineHeight: '18px',
      color: euiTheme.colors.textSubdued,
      margin: 0,
      display: '-webkit-box',
      WebkitBoxOrient: 'vertical',
      WebkitLineClamp: 3,
      overflow: 'hidden',
    }),
  // Tabs + field list; 8px gap between tab underline and the bordered list
  tabsAndFields: css({
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  }),
  tabs: css({
    flexShrink: 0,
  }),
  tabCount: ({ euiTheme }: UseEuiTheme) =>
    css({
      marginInlineStart: euiTheme.size.xs,
    }),
  // Mockup: bordered field list — r=8, connected rows
  fieldList: ({ euiTheme }: UseEuiTheme) =>
    css({
      backgroundColor: euiTheme.colors.backgroundBasePlain,
      border: `1px solid ${euiTheme.colors.borderBaseSubdued}`,
      borderRadius: '8px',
      overflow: 'hidden',
    }),
  // Figma: field-inner — pad=[16,16,16,16], gap=4
  fieldRow: css({
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  }),
  fieldLabelRow: css({
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  }),
  // Neutral text-token chip (matches EuiCode default), uppercase monospace
  typeBadge: ({ euiTheme }: UseEuiTheme) =>
    css({
      display: 'inline-block',
      padding: '2px 6px',
      borderRadius: euiTheme.border.radius.small,
      backgroundColor: euiTheme.colors.backgroundLightText,
      color: euiTheme.colors.textParagraph,
      fontFamily: euiTheme.font.familyCode,
      fontSize: '10px',
      fontWeight: 600,
      lineHeight: '12px',
      letterSpacing: '0.02em',
      textTransform: 'uppercase',
      maxWidth: '200px',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      flexShrink: 1,
      verticalAlign: 'middle',
    }),
  fieldName: css({
    fontWeight: 600,
  }),
  // Mockup: Required uses danger/red emphasis on the trailing edge
  requiredBadge: ({ euiTheme }: UseEuiTheme) =>
    css({
      marginLeft: 'auto',
      flexShrink: 0,
      fontSize: '10px',
      fontWeight: 500,
      lineHeight: '16px',
      color: euiTheme.colors.textDanger,
      letterSpacing: '0.02em',
    }),
  fieldDescription: css({
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    display: 'block',
  }),
  fieldDivider: ({ euiTheme }: UseEuiTheme) =>
    css({
      height: '1px',
      backgroundColor: euiTheme.colors.borderBaseSubdued,
    }),
  emptyFields: css({
    padding: '16px',
  }),
  codeText: ({ euiTheme }: UseEuiTheme) =>
    css({
      margin: 0,
      fontFamily: euiTheme.font.familyCode,
      fontSize: '12px',
      lineHeight: '19px',
      whiteSpace: 'pre',
    }),
  yamlPreview: css({
    padding: '16px',
  }),
};

const defaultPanelStyles = {
  root: css({
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  }),
  // Figma: Info hero — r=4, pad=[16,24,24,24], gap=16, flex:1
  hero: ({ euiTheme }: UseEuiTheme) =>
    css({
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '16px',
      flex: 1,
      justifyContent: 'center',
      borderRadius: '4px',
      padding: `${euiTheme.size.base} 24px 24px 24px`,
    }),
  illustration: css({
    width: '128px',
    height: '128px',
    flexShrink: 0,
  }),
  // Figma: TEXT — fs=14, fw=500, lh=24
  heroText: ({ euiTheme }: UseEuiTheme) =>
    css({
      fontSize: '14px',
      fontWeight: 500,
      lineHeight: '24px',
      color: euiTheme.colors.textParagraph,
      margin: 0,
      textAlign: 'center',
    }),
  // Figma: connected Documentation + Download schema block
  cardsSection: ({ euiTheme }: UseEuiTheme) =>
    css({
      flexShrink: 0,
      margin: '16px',
      borderRadius: euiTheme.border.radius.medium,
      border: `1px solid ${euiTheme.colors.borderBaseSubdued}`,
      backgroundColor: euiTheme.colors.backgroundBasePlain,
      overflow: 'hidden',
    }),
};

const resourceCardStyles = {
  row: ({ euiTheme }: UseEuiTheme) =>
    css({
      display: 'block',
      width: '100%',
      padding: `12px ${euiTheme.size.base}`,
      border: 'none',
      borderBottom: `1px solid ${euiTheme.colors.borderBaseSubdued}`,
      borderRadius: 0,
      backgroundColor: euiTheme.colors.backgroundBasePlain,
      textAlign: 'left',
      textDecoration: 'none',
      color: 'inherit',
      cursor: 'pointer',
      '&:last-child': {
        borderBottom: 'none',
      },
      '&:hover': {
        backgroundColor: euiTheme.colors.backgroundBaseSubdued,
        textDecoration: 'none',
      },
      '&:focus': {
        backgroundColor: euiTheme.colors.backgroundBaseSubdued,
        outline: 'none',
      },
    }),
};

const previewStepRowStyles = {
  row: ({ euiTheme }: UseEuiTheme) =>
    css({
      display: 'flex',
      alignItems: 'center',
      width: '100%',
      padding: `12px ${euiTheme.size.base}`,
      gap: '11px',
      backgroundColor: euiTheme.colors.backgroundBasePlain,
      border: 'none',
      borderBottom: `1px solid ${euiTheme.colors.borderBaseSubdued}`,
      borderRadius: 0,
      cursor: 'pointer',
      textAlign: 'left',
      margin: 0,
      '&:last-child': {
        borderBottom: 'none',
      },
      '&:hover': {
        backgroundColor: euiTheme.colors.backgroundBaseSubdued,
      },
      '& .rowActions': {
        opacity: 0,
        pointerEvents: 'none',
      },
      '&:hover .rowActions': {
        opacity: 1,
        pointerEvents: 'auto',
      },
    }),
  // Keep radius on the same rule as fill so corners render cleanly
  iconContainer: css({
    width: '40px',
    height: '40px',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '8px',
    boxSizing: 'border-box',
  }),
  iconContainerPlatform: ({ euiTheme }: UseEuiTheme) =>
    css({
      backgroundColor: euiTheme.colors.vis.euiColorVis2,
      border: 'none',
    }),
  iconContainerTrigger: ({ euiTheme }: UseEuiTheme) =>
    css({
      backgroundColor: euiTheme.colors.vis.euiColorVis4,
      border: 'none',
    }),
  iconContainerAppLogo: ({ euiTheme }: UseEuiTheme) =>
    css({
      backgroundColor: euiTheme.colors.backgroundBasePlain,
      border: `1px solid ${euiTheme.colors.borderBaseProminent}`,
    }),
  iconContainerFlowControl: ({ euiTheme }: UseEuiTheme) =>
    css({
      backgroundColor: euiTheme.colors.vis.euiColorVis0,
      border: 'none',
    }),
  iconContainerDataTransformation: ({ euiTheme }: UseEuiTheme) =>
    css({
      backgroundColor: euiTheme.colors.vis.euiColorVis8,
      border: 'none',
    }),
  info: css({
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    flex: 1,
    minWidth: 0,
  }),
  labelText: ({ euiTheme }: UseEuiTheme) =>
    css({
      fontSize: '12px',
      fontWeight: 700,
      lineHeight: '15px',
      color: euiTheme.colors.textParagraph,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      display: 'block',
    }),
  description: css({
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    display: 'block',
  }),
  chevron: css({
    flexShrink: 0,
  }),
  rowActions: css({
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: '4px',
  }),
  rowActionButton: css({
    inlineSize: '32px',
    blockSize: '32px',
    width: '32px',
    height: '32px',
  }),
};
