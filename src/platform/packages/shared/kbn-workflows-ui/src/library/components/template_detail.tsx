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
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import type { IconType } from '@elastic/eui';
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
  /** Optional navigation control rendered at the top of the metadata column. */
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

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="m"
      data-test-subj="workflowLibraryTemplateDetail"
      css={{ height: '100%' }}
    >
      <EuiFlexItem>
        <EuiFlexGroup gutterSize="m" alignItems="flexStart">
          <EuiFlexItem grow={false} css={{ width: '30%' }}>
            <EuiFlexGroup direction="column" gutterSize="m">
              {backButton ? (
                <EuiFlexItem grow={false} css={{ alignSelf: 'flex-start' }}>
                  {backButton}
                </EuiFlexItem>
              ) : null}

              <EuiFlexItem grow={false}>
                <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false} wrap>
                  <EuiFlexItem grow={false}>
                    <EuiTitle size="l">
                      <h1>{metadata.name}</h1>
                    </EuiTitle>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiBadge color="hollow" data-test-subj="workflowLibraryTemplateDetail-version">
                      {i18n.translate('workflows.library.templateDetail.version', {
                        defaultMessage: 'v{version}',
                        values: { version: metadata.version },
                      })}
                    </EuiBadge>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>

              <EuiFlexItem grow={false}>
                <CatalogTemplateIcons stepTypes={stepTypes} triggerTypes={triggerTypes} />
              </EuiFlexItem>

              <EuiFlexItem grow={false}>
                <EuiText color="subdued">{metadata.description}</EuiText>
              </EuiFlexItem>

              <EuiFlexItem grow={false}>
                <EuiFlexGroup gutterSize="s" alignItems="center">
                  <EuiFlexItem grow={false}>
                    <EuiText size="xs">
                      <strong>
                        {i18n.translate('workflows.library.templateDetail.solutionsLabel', {
                          defaultMessage: 'Solutions:',
                        })}
                      </strong>
                    </EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiFlexGroup
                      gutterSize="xs"
                      wrap
                      responsive={false}
                      data-test-subj="workflowLibraryTemplateDetail-solutions"
                    >
                      {solutions.map((solution) => (
                        <EuiFlexItem grow={false} key={`solution-${solution}`}>
                          <EuiBadge color="hollow" iconType={SOLUTION_ICONS[solution]}>
                            {capitalize(solution)}
                          </EuiBadge>
                        </EuiFlexItem>
                      ))}
                    </EuiFlexGroup>
                  </EuiFlexItem>
                </EuiFlexGroup>

                <EuiSpacer size="s" />

                <EuiFlexGroup gutterSize="s" alignItems="center">
                  <EuiFlexItem grow={false}>
                    <EuiText size="xs">
                      <strong>
                        {i18n.translate('workflows.library.templateDetail.categoriesLabel', {
                          defaultMessage: 'Categories:',
                        })}
                      </strong>
                    </EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiFlexGroup
                      gutterSize="xs"
                      wrap
                      responsive={false}
                      data-test-subj="workflowLibraryTemplateDetail-categories"
                    >
                      {metadata.categories.map((category) => (
                        <EuiFlexItem grow={false} key={`category-${category}`}>
                          <EuiBadge color="hollow">{humanizeCategoryId(category)}</EuiBadge>
                        </EuiFlexItem>
                      ))}
                    </EuiFlexGroup>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>

          <EuiFlexItem
            css={{
              height: '100%',
              border: `1px solid ${euiTheme.colors.borderBaseSubdued}`,
              backgroundColor: euiTheme.colors.backgroundBaseSubdued,
              boxSizing: 'border-box',
              minHeight: 0,
              overflow: 'hidden',
              padding: euiTheme.size.s,
              position: 'relative',
            }}
          >
            <EuiBadge
              color="warning"
              style={{
                left: '50%',
                padding: `0 ${euiTheme.size.l}`,
                position: 'absolute',
                top: euiTheme.size.s,
                transform: 'translateX(-50%)',
                zIndex: euiTheme.levels.content,
              }}
            >
              {i18n.translate('workflows.library.templateDetail.previewTitle', {
                defaultMessage: 'Preview',
              })}
            </EuiBadge>
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
                    renderStepIcon={renderStepIcon}
                  />
                </div>
              </EuiFocusTrap>
            ) : null}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});
TemplateDetail.displayName = 'TemplateDetail';
