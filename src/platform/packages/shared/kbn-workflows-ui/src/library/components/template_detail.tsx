/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiBadge,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFocusTrap,
  EuiIconTip,
  EuiLoadingSpinner,
  useEuiShadow,
  useEuiTheme,
} from '@elastic/eui';
import type { IconType } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { stringify } from 'yaml';
import { i18n } from '@kbn/i18n';
import {
  getStepByNameFromNestedSteps,
  transformWorkflowToGraph,
  type WorkflowYaml,
} from '@kbn/workflows';
import { renderTemplate } from '@kbn/workflows-library';
import type { TemplateBody } from '@kbn/workflows-library';
import { CatalogTemplateIcons } from './catalog_template_icons';
import { WorkflowYamlPreview } from './template_yaml_preview';
import {
  ReactFlowProvider,
  type RenderStepIcon,
  TypeIcon,
  WorkflowDetailBottomBar,
  type WorkflowDetailBottomBarView,
  WorkflowGraphCanvasWithoutProvider,
  WorkflowVisualEditorFlyout,
  type WorkflowVisualEditorFlyoutTarget,
} from '../../components';
import { useTemplate } from '../hooks/use_template';
import { getWorkflowTypes } from '../lib/get_workflow_types';
import { humanizeCategoryId } from '../lib/humanize_category_id';

export interface TemplateDetailProps {
  slug: string;
  /** Called once the template body has loaded — e.g. to set breadcrumbs. */
  onLoaded?: (template: TemplateBody) => void;
  /**
   * Rendered at the top of the left column (e.g. a "Back to library" link). Kept
   * as a slot so navigation stays in the host app while this component owns the
   * full two-column layout (letting the preview panel reach the top of the page).
   */
  backButton?: React.ReactNode;
  /** Enables the graph/YAML preview toggle. Defaults to YAML-only when false. */
  showGraphPreview?: boolean;
}

/** App icons for the known solutions; unknown solutions render without one. */
const SOLUTION_ICONS: Record<string, IconType> = {
  security: 'logoSecurity',
  observability: 'logoObservability',
  search: 'logoElasticsearch',
};

const TRIGGER_LABEL: Record<string, string> = {
  manual: 'Manual',
  alert: 'Alert',
  scheduled: 'Scheduled',
};

const capitalize = (value: string): string =>
  value.length > 0 ? value[0].toUpperCase() + value.slice(1) : value;

/**
 * Workflow Template Library detail view: friendly template metadata (solution
 * and category badges, step/trigger icons) plus a read-only preview of the
 * template's workflow definition.
 */
export const TemplateDetail = React.memo<TemplateDetailProps>(function TemplateDetail({
  slug,
  onLoaded,
  backButton,
  showGraphPreview = false,
}) {
  const { data, isLoading, isError } = useTemplate(slug);
  const { euiTheme } = useEuiTheme();
  const previewShadow = useEuiShadow('xl');
  const [previewView, setPreviewView] = useState<WorkflowDetailBottomBarView>('graph');
  const [selectedGraphStepId, setSelectedGraphStepId] = useState<string | undefined>();
  const flyoutPanelRef = useRef<HTMLDivElement | null>(null);

  const previewYaml = useMemo(() => (data ? renderTemplate({ template: data }) : ''), [data]);
  const workflow = useMemo(() => data?.body as WorkflowYaml | undefined, [data]);
  const transformed = useMemo(
    () => (workflow ? transformWorkflowToGraph(workflow) : undefined),
    [workflow]
  );
  const { stepTypes, triggerTypes } = useMemo(
    () => (data ? getWorkflowTypes(data.body) : { stepTypes: [], triggerTypes: [] }),
    [data]
  );
  const activePreviewView = showGraphPreview ? previewView : 'yaml';
  const selectedPreviewTarget = useMemo<WorkflowVisualEditorFlyoutTarget | undefined>(() => {
    if (!selectedGraphStepId || !workflow || !transformed) {
      return undefined;
    }

    const ref = transformed.nodeRefs[selectedGraphStepId];
    if (!ref) {
      return undefined;
    }

    if (ref.kind === 'trigger') {
      const trigger = workflow.triggers?.[ref.triggerIndex];
      if (!trigger) {
        return undefined;
      }

      return {
        kind: 'trigger',
        triggerType: ref.triggerType,
        triggerLabel: TRIGGER_LABEL[ref.triggerType] ?? ref.triggerType,
        yamlSnippet: stringify({ triggers: [trigger] }).trimEnd(),
      };
    }

    const step = getStepByNameFromNestedSteps(workflow.steps, ref.stepName);
    if (!step) {
      return undefined;
    }

    return {
      kind: 'step',
      stepName: ref.stepName,
      stepType: step.type,
      yamlSnippet: stringify([step]).trimEnd(),
    };
  }, [selectedGraphStepId, transformed, workflow]);

  const renderStepIcon = useCallback<RenderStepIcon>(({ stepType, isTrigger, size, color }) => {
    return (
      <TypeIcon type={stepType} kind={isTrigger ? 'trigger' : 'step'} size={size} color={color} />
    );
  }, []);

  const closeGraphPreviewTarget = useCallback(() => setSelectedGraphStepId(undefined), []);
  const openGraphTargetInYaml = useCallback(() => {
    setPreviewView('yaml');
    closeGraphPreviewTarget();
  }, [closeGraphPreviewTarget]);
  const handleFlyoutKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        closeGraphPreviewTarget();
      }
    },
    [closeGraphPreviewTarget]
  );

  useEffect(() => {
    if (data) {
      onLoaded?.(data);
    }
  }, [data, onLoaded]);

  useEffect(() => {
    if (selectedPreviewTarget) {
      flyoutPanelRef.current?.focus();
    }
  }, [selectedPreviewTarget]);

  if (isLoading) {
    return <EuiLoadingSpinner size="xl" data-test-subj="workflowLibraryTemplateDetail-loading" />;
  }

  if (isError || !data) {
    return (
      <EuiCallOut
        data-test-subj="workflowLibraryTemplateDetail-error"
        color="danger"
        iconType="warning"
        title={i18n.translate('workflows.library.templateDetail.errorTitle', {
          defaultMessage: 'Unable to load this template',
        })}
        announceOnMount
      />
    );
  }

  const { metadata } = data;
  // No specific solutions listed means all solutions are supported
  const solutions = metadata.solutions?.length ? metadata.solutions : Object.keys(SOLUTION_ICONS);

  const styles = {
    // Left column holds the back link + metadata; nudged down so the back link
    // sits a little below the top while the preview panel reaches the top edge.
    leftColumn: css({
      flexBasis: 450,
      maxWidth: 450,
      minWidth: 0,
      paddingTop: euiTheme.size.l,
      width: '30%',
    }),
    // 48px between the back link and the icons row (Figma "Content Container" gap).
    leftStack: css({ gap: euiTheme.size.xxxl }),
    // 32px between the title block and the details block (Figma "Container" gap).
    header: css({ gap: euiTheme.size.xl }),
    // 16px between the icons row and the title row (Figma "Title" gap).
    titleBlock: css({ gap: euiTheme.size.base }),
    // 8px between the title and the version badge (Figma "Main" gap).
    titleRow: css({ gap: euiTheme.size.s }),
    // 16px between the title and the tags below it.
    titleAndTags: css({ gap: euiTheme.size.base }),
    title: css({
      margin: 0,
      fontWeight: euiTheme.font.weight.semiBold,
      fontSize: '24px',
      lineHeight: '28px',
      color: euiTheme.colors.textHeading,
    }),
    // 16px between the info card and the description (Figma "Details" gap).
    details: css({ gap: euiTheme.size.base }),
    // Bordered, rounded metadata card: 12px/16px padding, 16px between columns.
    infoCard: css({
      display: 'flex',
      gap: euiTheme.size.base,
      padding: `${euiTheme.size.m} ${euiTheme.size.base}`,
      border: `${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBaseSubdued}`,
      borderRadius: euiTheme.border.radius.medium,
    }),
    infoBlock: css({
      display: 'flex',
      flexDirection: 'column',
      gap: euiTheme.size.xs,
      // Solutions and Version each take an equal (50%) share of the card.
      flexGrow: 1,
      flexBasis: 0,
      minWidth: 0,
    }),
    infoLabel: css({
      fontWeight: euiTheme.font.weight.medium,
      fontSize: '12px',
      lineHeight: '20px',
      color: euiTheme.colors.textSubdued,
    }),
    badgeRow: css({
      display: 'flex',
      flexWrap: 'wrap',
      gap: euiTheme.size.xs,
      alignItems: 'center',
    }),
    // Solutions shown as product logos only (name on hover).
    solutionRow: css({
      display: 'flex',
      flexWrap: 'wrap',
      gap: euiTheme.size.s,
      alignItems: 'center',
    }),
    divider: css({
      width: euiTheme.border.width.thin,
      alignSelf: 'stretch',
      backgroundColor: euiTheme.colors.borderBaseSubdued,
    }),
    infoValue: css({
      fontWeight: euiTheme.font.weight.bold,
      fontSize: '14px',
      lineHeight: '24px',
      color: euiTheme.colors.text,
    }),
    description: css({
      margin: 0,
      fontSize: '14px',
      lineHeight: '24px',
      color: euiTheme.colors.text,
    }),
    // Preview panel fills the row height; its 8px top/right/bottom margins come
    // from the page's content padding. Relative so the "Preview" pill can float.
    panel: css({
      position: 'relative',
      minHeight: 0,
      border: `${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBaseSubdued}`,
      backgroundColor: euiTheme.colors.backgroundBaseSubdued,
    }),
    // "Preview" pill floats centered over the top of the editor (16px down).
    previewBadge: css({
      position: 'absolute',
      insetBlockStart: euiTheme.size.base,
      insetInlineStart: '50%',
      transform: 'translateX(-50%)',
      zIndex: 2,
    }),
    // Editor fills the panel; 8px inset on top/right/bottom, left keeps Monaco's gutter.
    editorInset: css({
      flexGrow: 1,
      minHeight: 0,
      overflow: 'hidden',
      padding: `${euiTheme.size.s} ${euiTheme.size.s} ${euiTheme.size.s} 0`,
    }),
  };

  return (
    <EuiFlexGroup
      // 24px gutter so the left column has matching 24px padding on both sides
      // (its left comes from the page content padding).
      gutterSize="l"
      alignItems="stretch"
      data-test-subj="workflowLibraryTemplateDetail"
      css={{ height: '100%' }}
    >
      <EuiFlexItem grow={false} css={styles.leftColumn}>
        <EuiFlexGroup direction="column" gutterSize="none" css={styles.leftStack}>
          {backButton ? (
            // Shrink-wrap + align left so the button's label isn't centered by the
            // full-width column (EuiButtonEmpty centers its content otherwise).
            <EuiFlexItem grow={false} css={{ alignItems: 'flex-start' }}>
              {backButton}
            </EuiFlexItem>
          ) : null}

          <EuiFlexItem grow={false}>
            <EuiFlexGroup direction="column" gutterSize="none" css={styles.header}>
              {/* Title block: icons, then title + version, then tags (Figma order). */}
              <EuiFlexItem grow={false}>
                <EuiFlexGroup direction="column" gutterSize="none" css={styles.titleBlock}>
                  <EuiFlexItem grow={false}>
                    <CatalogTemplateIcons stepTypes={stepTypes} triggerTypes={triggerTypes} />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiFlexGroup direction="column" gutterSize="none" css={styles.titleAndTags}>
                      <EuiFlexItem grow={false}>
                        <h1 css={styles.title}>{metadata.name}</h1>
                      </EuiFlexItem>

                      {metadata.categories.length > 0 ? (
                        <EuiFlexItem grow={false}>
                          <div
                            css={styles.badgeRow}
                            data-test-subj="workflowLibraryTemplateDetail-tags"
                          >
                            {metadata.categories.map((category) => (
                              <EuiBadge key={`tag-${category}`} color="hollow">
                                {humanizeCategoryId(category)}
                              </EuiBadge>
                            ))}
                          </div>
                        </EuiFlexItem>
                      ) : null}
                    </EuiFlexGroup>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>

              {/* Details block: solutions info card, then description. */}
              <EuiFlexItem grow={false}>
                <EuiFlexGroup direction="column" gutterSize="none" css={styles.details}>
                  <EuiFlexItem grow={false}>
                    <div css={styles.infoCard}>
                      <div
                        css={styles.infoBlock}
                        data-test-subj="workflowLibraryTemplateDetail-solutions"
                      >
                        <span css={styles.infoLabel}>
                          {i18n.translate('workflows.library.templateDetail.solutionsLabel', {
                            defaultMessage: 'Solutions',
                          })}
                        </span>
                        <div css={styles.solutionRow}>
                          {solutions.map((solution) => {
                            const label = capitalize(solution);
                            const icon = SOLUTION_ICONS[solution];
                            return icon ? (
                              <EuiIconTip
                                key={`solution-${solution}`}
                                type={icon}
                                size="m"
                                content={label}
                                aria-label={label}
                                iconProps={{
                                  'data-test-subj': `workflowLibraryTemplateDetail-solution-${solution}`,
                                }}
                              />
                            ) : (
                              <EuiBadge key={`solution-${solution}`} color="hollow">
                                {label}
                              </EuiBadge>
                            );
                          })}
                        </div>
                      </div>

                      <div css={styles.divider} />

                      <div
                        css={styles.infoBlock}
                        data-test-subj="workflowLibraryTemplateDetail-version"
                      >
                        <span css={styles.infoLabel}>
                          {i18n.translate('workflows.library.templateDetail.versionLabel', {
                            defaultMessage: 'Version',
                          })}
                        </span>
                        <span css={styles.infoValue}>{metadata.version}</span>
                      </div>
                    </div>
                  </EuiFlexItem>

                  <EuiFlexItem grow={false}>
                    <p css={styles.description}>{metadata.description}</p>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>

      {/* Preview panel: editor fills the height; the "Preview" pill floats on top. */}
      <EuiFlexItem css={styles.panel}>
        <div css={styles.previewBadge}>
          <EuiBadge
            color="warning"
            css={css(previewShadow)}
            style={{ padding: `0 ${euiTheme.size.l}` }}
          >
            {i18n.translate('workflows.library.templateDetail.previewTitle', {
              defaultMessage: 'Preview',
            })}
          </EuiBadge>
        </div>

        <EuiFlexGroup direction="column" gutterSize="none" css={{ height: '100%' }}>
          <EuiFlexItem grow css={styles.editorInset}>
            {activePreviewView === 'graph' ? (
              <ReactFlowProvider>
                <WorkflowGraphCanvasWithoutProvider
                  workflow={workflow}
                  transformed={transformed}
                  isYamlValid={true}
                  selectedStepId={selectedGraphStepId}
                  onStepSelect={setSelectedGraphStepId}
                  canRunSteps={false}
                  renderStepIcon={renderStepIcon}
                  fitView={true}
                  fitViewOptions={{ padding: 0.35, minZoom: 0.2, maxZoom: 1.2 }}
                  showZoomControls={true}
                />
              </ReactFlowProvider>
            ) : (
              <WorkflowYamlPreview
                yaml={previewYaml}
                height="100%"
                data-test-subj="workflowLibraryTemplateDetail-preview"
              />
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
        {showGraphPreview ? (
          <WorkflowDetailBottomBar
            editorView={previewView}
            onEditorViewChange={setPreviewView}
            disableAutoCollapse={true}
          />
        ) : null}
        {activePreviewView === 'graph' && selectedPreviewTarget ? (
          <EuiFocusTrap returnFocus>
            <div
              ref={flyoutPanelRef}
              tabIndex={-1}
              onKeyDown={handleFlyoutKeyDown}
              css={{
                position: 'absolute',
                top: euiTheme.size.s,
                right: euiTheme.size.s,
                bottom: euiTheme.size.s,
                width: 420,
                zIndex: euiTheme.levels.flyout,
                boxShadow:
                  '0 0 2px 0 rgba(43, 57, 79, 0.16), 0 4px 13px 0 rgba(43, 57, 79, 0.12), 0 8px 17px 0 rgba(43, 57, 79, 0.07)',
                borderRadius: euiTheme.border.radius.medium,
                overflow: 'hidden',
                outline: 'none',
              }}
              data-test-subj="workflowLibraryTemplateDetailGraphFlyout"
            >
              <WorkflowVisualEditorFlyout
                target={selectedPreviewTarget}
                editorYaml={previewYaml}
                canExecuteWorkflow={false}
                isYamlValid={true}
                onClose={closeGraphPreviewTarget}
                onOpenInYaml={openGraphTargetInYaml}
                renderStepIcon={renderStepIcon}
              />
            </div>
          </EuiFocusTrap>
        ) : null}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});
TemplateDetail.displayName = 'TemplateDetail';
