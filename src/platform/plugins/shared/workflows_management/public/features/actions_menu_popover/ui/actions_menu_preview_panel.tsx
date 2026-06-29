/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UseEuiTheme } from '@elastic/eui';
import { useEuiTheme } from '@elastic/eui';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiImage,
  EuiNotificationBadge,
  EuiTab,
  EuiTabs,
  EuiText,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useMemo, useState } from 'react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { stepSchemas } from '../../../../common/step_schemas';
import { useKibana } from '../../../hooks/use_kibana';
import { getBaseConnectorType } from '../../../shared/ui/step_icons/get_base_connector_type';
import { StepIcon } from '../../../shared/ui/step_icons/step_icon';
import { getFieldsFromZodSchema } from '../lib/get_step_preview_fields';
import type { ActionOptionData, JumpToStepEntry } from '../types';
import {
  isActionConnectorGroup,
  isActionConnectorOption,
  isActionGroup,
  isActionOption,
} from '../types';

type TabId = 'inputs' | 'outputs' | 'yaml';

interface ActionsMenuPreviewPanelProps {
  hoveredOption: ActionOptionData | null;
  hoveredJumpEntry?: JumpToStepEntry | null;
  onStepSelected: (action: ActionOptionData) => void;
}

export function ActionsMenuPreviewPanel({
  hoveredOption,
  hoveredJumpEntry,
  onStepSelected,
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

  const fields = activeTab === 'inputs' ? inputFields : outputFields;

  const yamlSnippet = useMemo(() => {
    if (!hoveredOption || !isLeaf) return '';
    const stepId = hoveredOption.id;
    const required = inputFields.filter((f) => f.required);
    const lines: string[] = [`- step: ${stepId}`];
    if (required.length > 0) {
      lines.push('  inputs:');
      for (const f of required) {
        const placeholder =
          f.typeName === 'STRING'
            ? '""'
            : f.typeName === 'BOOLEAN'
            ? 'false'
            : f.typeName === 'NUMBER' || f.typeName === 'INTEGER'
            ? '0'
            : '{}';
        lines.push(`    ${f.name}: ${placeholder}`);
      }
    }
    return lines.join('\n');
  }, [hoveredOption, isLeaf, inputFields]);

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
      yamlSnippet={yamlSnippet}
      styles={styles}
    />
  );
}

/* ── Default state ── */

function DefaultPanel() {
  const styles = useMemoCss(defaultPanelStyles);
  const { http } = useKibana().services;
  const illustrationUrl = http?.basePath.prepend(
    '/plugins/workflowsManagement/assets/illustration_hand_touch.svg'
  );
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
          hasBorderBottom
        />
        <ResourceCard
          title={i18n.translate('workflows.actionsMenu.preview.downloadSchema', {
            defaultMessage: 'Download schema',
          })}
          description={i18n.translate('workflows.actionsMenu.preview.downloadSchemaDesc', {
            defaultMessage: 'Schema the full JSON schema',
          })}
          iconType="download"
        />
      </div>
    </div>
  );
}

function ResourceCard({
  title,
  description,
  iconType,
  hasBorderBottom,
}: {
  title: string;
  description: string;
  iconType: string;
  hasBorderBottom?: boolean;
}) {
  const styles = useMemoCss(resourceCardStyles);
  return (
    <div css={[styles.card, hasBorderBottom && styles.cardWithBorder]}>
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
          <EuiIcon type={iconType} color="primary" size="m" />
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
}

/* ── Jump step YAML preview ── */

function JumpStepPanel({ entry }: { entry: JumpToStepEntry }) {
  const styles = useMemoCss(panelStyles);
  return (
    <div css={styles.panel}>
      <div css={styles.titleBlock}>
        <p css={styles.titleBlockText}>
          {entry.id}
          <br />
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
  styles,
}: {
  section: ActionOptionData;
  onStepSelected: (action: ActionOptionData) => void;
  styles: ReturnType<typeof useMemoCss<typeof panelStyles>>;
}) {
  const steps = isActionGroup(section)
    ? section.options
    : isActionConnectorGroup(section)
    ? section.options
    : [];

  return (
    <div css={styles.panel}>
      <div css={styles.titleBlock}>
        <p css={styles.titleBlockText}>
          {section.label}
          {section.description && (
            <>
              <br />
              {section.description}
            </>
          )}
        </p>
      </div>
      <div css={styles.stepList}>
        {steps.map((step) => (
          <PreviewStepRow key={step.id} step={step} onClick={() => onStepSelected(step)} />
        ))}
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
  yamlSnippet,
  styles,
}: {
  step: ActionOptionData;
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  fields: ReturnType<typeof getFieldsFromZodSchema>;
  inputCount: number;
  outputCount: number;
  examples: string[];
  yamlSnippet: string;
  styles: ReturnType<typeof useMemoCss<typeof panelStyles>>;
}) {
  return (
    <div css={styles.panel}>
      <div css={styles.titleBlock}>
        <p css={styles.titleBlockText}>
          {step.id}
          {(() => {
            const subtitle =
              step.description && step.description !== step.id
                ? step.description
                : step.label && step.label !== step.id
                ? step.label
                : null;
            return subtitle ? (
              <>
                <br />
                {subtitle}
              </>
            ) : null;
          })()}
        </p>
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
          <EuiTab isSelected={activeTab === 'yaml'} onClick={() => onTabChange('yaml')}>
            <FormattedMessage id="workflows.actionsMenu.preview.yaml" defaultMessage="YAML" />
          </EuiTab>
        </EuiTabs>

        {activeTab === 'yaml' ? (
          <div css={styles.fieldList}>
            <div css={styles.yamlPreview}>
              <pre css={styles.codeText}>{yamlSnippet || `- step: ${step.id}`}</pre>
            </div>
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
                          defaultMessage="required"
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

      {examples.length > 0 && (
        <div css={styles.exampleSection}>
          <p css={styles.exampleLabel}>
            <FormattedMessage id="workflows.actionsMenu.preview.example" defaultMessage="Example" />
          </p>
          <div css={styles.codeBlock}>
            <pre css={styles.codeText}>{examples[0]}</pre>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Step row (used in section preview) ── */

function PreviewStepRow({ step, onClick }: { step: ActionOptionData; onClick: () => void }) {
  const styles = useMemoCss(previewStepRowStyles);
  const { euiTheme } = useEuiTheme();
  const isPink =
    isActionGroup(step) || isActionOption(step)
      ? step.iconColor === euiTheme.colors.vis.euiColorVis6
      : false;
  return (
    <button type="button" css={styles.row} onClick={onClick}>
      <span css={[styles.iconContainer, isPink ? styles.iconContainerPink : styles.iconContainerBlue]}>
        {isActionConnectorGroup(step) || isActionConnectorOption(step) ? (
          <StepIcon
            stepType={getBaseConnectorType(step.connectorType)}
            executionStatus={undefined}
          />
        ) : isActionGroup(step) || isActionOption(step) ? (
          <EuiIcon type={step.iconType} size="m" color={step.iconColor} aria-hidden />
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
    </button>
  );
}

/* ── Styles ── */

const panelStyles = {
  // Figma: Info frame — bg=gray, r=4, pad=[16,24,24,24], gap=16
  panel: ({ euiTheme }: UseEuiTheme) =>
    css({
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflowY: 'auto',
      borderRadius: '4px',
      padding: `${euiTheme.size.base} 24px 24px 24px`,
      gap: euiTheme.size.base,
    }),
  titleBlock: css({
    flexShrink: 0,
  }),
  // Figma: fs=14, fw=500, lh=24, max 3 lines (3×24=72px as in Figma node)
  titleBlockText: ({ euiTheme }: UseEuiTheme) =>
    css({
      fontSize: '14px',
      fontWeight: 500,
      lineHeight: '24px',
      color: euiTheme.colors.textParagraph,
      margin: 0,
      display: '-webkit-box',
      WebkitBoxOrient: 'vertical',
      WebkitLineClamp: 3,
      overflow: 'hidden',
    }),
  // Figma: Frame 8 steps list — r=8
  stepList: css({
    flex: 1,
    overflowY: 'auto',
    borderRadius: '8px',
  }),
  // Figma: Frame 8 tabs+fields — r=16, no background on tabs row
  tabsAndFields: css({
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    borderRadius: '16px',
    overflow: 'hidden',
  }),
  tabs: css({
    flexShrink: 0,
  }),
  tabCount: ({ euiTheme }: UseEuiTheme) =>
    css({
      marginInlineStart: euiTheme.size.xs,
    }),
  // Figma: form-content — bg=white
  fieldList: ({ euiTheme }: UseEuiTheme) =>
    css({
      backgroundColor: euiTheme.colors.backgroundBasePlain,
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
  typeBadge: ({ euiTheme }: UseEuiTheme) =>
    css({
      display: 'inline-block',
      padding: '2px 6px',
      borderRadius: '4px',
      backgroundColor: euiTheme.colors.backgroundBaseSubdued,
      color: euiTheme.colors.textSubdued,
      fontSize: '10px',
      fontWeight: 600,
      lineHeight: '12px',
      maxWidth: '200px',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      flexShrink: 1,
      verticalAlign: 'middle',
    }),
  fieldName: css({
    fontWeight: 500,
  }),
  requiredBadge: ({ euiTheme }: UseEuiTheme) =>
    css({
      marginLeft: 'auto',
      flexShrink: 0,
      fontSize: '10px',
      fontWeight: 500,
      lineHeight: '16px',
      color: euiTheme.colors.textSubdued,
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
  // Figma: Frame 10 example section — gap=4
  exampleSection: css({
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  }),
  // Figma: "Example" TEXT — fs=14, fw=600, lh=20
  exampleLabel: ({ euiTheme }: UseEuiTheme) =>
    css({
      fontSize: '14px',
      fontWeight: 600,
      lineHeight: '20px',
      color: euiTheme.colors.textParagraph,
      margin: 0,
    }),
  // Figma: Frame 48 code block — bg=white, r=10, pad=16
  codeBlock: ({ euiTheme }: UseEuiTheme) =>
    css({
      backgroundColor: euiTheme.colors.backgroundBasePlain,
      borderRadius: '10px',
      padding: '16px',
      overflow: 'auto',
    }),
  codeText: css({
    margin: 0,
    fontFamily: 'Roboto Mono, monospace',
    fontSize: '12px',
    lineHeight: '19px',
    whiteSpace: 'pre',
  }),
  yamlPreview: ({ euiTheme }: UseEuiTheme) =>
    css({
      padding: '16px',
      backgroundColor: euiTheme.colors.backgroundBasePlain,
      borderRadius: '0 0 16px 16px',
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
  // Figma: Frame 8 cards container — r=8, pad=[16,16,16,16], transparent bg
  cardsSection: css({
    flexShrink: 0,
    borderRadius: '8px',
    padding: '16px',
  }),
};

const resourceCardStyles = {
  // Figma: Info card — bg=white, pad=[12,16,12,16]
  card: ({ euiTheme }: UseEuiTheme) =>
    css({
      backgroundColor: euiTheme.colors.backgroundBasePlain,
      padding: `12px ${euiTheme.size.base}`,
    }),
  cardWithBorder: ({ euiTheme }: UseEuiTheme) =>
    css({
      borderBottom: `1px solid ${euiTheme.colors.borderBaseSubdued}`,
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
      cursor: 'pointer',
      textAlign: 'left',
      borderBottom: `1px solid ${euiTheme.colors.borderBaseSubdued}`,
      '&:last-child': {
        borderBottom: 'none',
      },
      '&:hover': {
        backgroundColor: euiTheme.colors.backgroundBaseSubdued,
      },
    }),
  iconContainer: css({
    width: '40px',
    height: '40px',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '8px',
    overflow: 'hidden',
  }),
  iconContainerBlue: css({
    backgroundColor: 'rgba(241, 246, 255)',
    border: '1px solid rgba(191, 219, 255)',
  }),
  iconContainerPink: css({
    backgroundColor: 'rgba(255, 235, 242)',
    border: '1px solid rgba(255, 199, 219)',
  }),
  info: css({
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    flex: 1,
    minWidth: 0,
  }),
  // Figma: Trigger Title — fs=12, fw=500, truncated
  labelText: ({ euiTheme }: UseEuiTheme) =>
    css({
      fontSize: '12px',
      fontWeight: 500,
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
};
