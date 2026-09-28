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
  EuiButtonGroup,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiSkeletonRectangle,
  EuiText,
  EuiToolTip,
  useEuiShadow,
  useEuiTheme,
} from '@elastic/eui';
import type { EuiButtonGroupOptionProps } from '@elastic/eui';
import React, { useCallback, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { AiIcon } from '@kbn/shared-ux-ai-components';
import { WORKFLOWS_EXPERIMENTAL_FEATURES_SETTING_ID } from '@kbn/workflows';
import type { Template } from '@kbn/workflows-library';
import { renderTemplate } from '@kbn/workflows-library';
import {
  RecommendedTemplateCard,
  TemplateDetail,
  useLibraryEnabled,
  useRecommendedTemplates,
  useWorkflowsApi,
} from '@kbn/workflows-ui';
import { useKibana } from '../../../hooks/use_kibana';
import { useWorkflowsExperimentalUiSetting } from '../../../hooks/use_workflows_experimental_ui_setting';
import { StepIcon } from '../../../shared/ui/step_icons/step_icon';

/** Prototype-only LLM hero states for empty-canvas demos. */
export type LlmPrototypeState = 'enabled' | 'missing' | 'onPrem';

const LLM_PROTOTYPE_OPTIONS: EuiButtonGroupOptionProps[] = [
  {
    id: 'enabled',
    label: i18n.translate('workflows.creationPanel.llmPrototype.enabled', {
      defaultMessage: 'LLM connected',
    }),
  },
  {
    id: 'missing',
    label: i18n.translate('workflows.creationPanel.llmPrototype.missing', {
      defaultMessage: 'LLM missing',
    }),
  },
  {
    id: 'onPrem',
    label: i18n.translate('workflows.creationPanel.llmPrototype.onPrem', {
      defaultMessage: 'On-prem',
    }),
  },
];

export interface WorkflowCreationPanelProps {
  readonly isAiAvailable: boolean;
  readonly onGenerateWithAi: (prompt: string) => void;
  readonly onPickTrigger: (triggerType: 'manual' | 'alert' | 'scheduled') => void;
  readonly onPickAction: (anchor: DOMRect) => void;
  readonly onBrowseTemplates: () => void;
  /** Writes rendered template YAML into the current (empty) workflow editor. */
  readonly onApplyTemplateYaml: (yaml: string) => void;
}

const AI_EXAMPLES = [
  {
    text: i18n.translate('workflows.creationPanel.aiExample.enrichAlerts', {
      defaultMessage: 'Enrich critical alerts and notify #security-alerts',
    }),
  },
  {
    text: i18n.translate('workflows.creationPanel.aiExample.openCase', {
      defaultMessage: 'Open a case for repeated failed logins',
    }),
  },
] as const;

const TRIGGER_CARDS: ReadonlyArray<{
  type: 'manual' | 'alert' | 'scheduled';
  title: string;
  description: string;
}> = [
  {
    type: 'manual',
    title: i18n.translate('workflows.creationPanel.trigger.manual', {
      defaultMessage: 'Manual',
    }),
    description: i18n.translate('workflows.creationPanel.trigger.manualDesc', {
      defaultMessage: 'Run on demand from the UI',
    }),
  },
  {
    type: 'alert',
    title: i18n.translate('workflows.creationPanel.trigger.alert', {
      defaultMessage: 'Alert',
    }),
    description: i18n.translate('workflows.creationPanel.trigger.alertDesc', {
      defaultMessage: 'When a detection or alerting rule fires',
    }),
  },
  {
    type: 'scheduled',
    title: i18n.translate('workflows.creationPanel.trigger.scheduled', {
      defaultMessage: 'Scheduled',
    }),
    description: i18n.translate('workflows.creationPanel.trigger.scheduledDesc', {
      defaultMessage: 'On an interval or schedule',
    }),
  },
];

/**
 * Empty-canvas creation experience: AI prompt, trigger cards, action-first,
 * and recommended templates (foundation slice).
 */
export function WorkflowCreationPanel({
  isAiAvailable,
  onGenerateWithAi,
  onPickTrigger,
  onPickAction,
  onBrowseTemplates,
  onApplyTemplateYaml,
}: WorkflowCreationPanelProps) {
  const { euiTheme } = useEuiTheme();
  const panelShadow = useEuiShadow('s');
  const {
    services: { application, notifications },
  } = useKibana();
  const api = useWorkflowsApi();
  const [prompt, setPrompt] = useState('');
  const [installSlug, setInstallSlug] = useState<string | null>(null);
  const [isApplyingTemplate, setIsApplyingTemplate] = useState(false);
  const [llmPrototypeState, setLlmPrototypeState] = useState<LlmPrototypeState>(
    isAiAvailable ? 'enabled' : 'missing'
  );
  const promptInputRef = useRef<HTMLTextAreaElement | null>(null);
  const showGraphPreview = useWorkflowsExperimentalUiSetting(
    WORKFLOWS_EXPERIMENTAL_FEATURES_SETTING_ID
  );

  const llmConnectorsHref = application.getUrlForApp('management', {
    deepLinkId: 'triggersActionsConnectors',
    path: '/connectors',
  });

  const showAiPrompt = llmPrototypeState === 'enabled';
  const showMissingNudge = llmPrototypeState === 'missing';
  const showOnPremNudge = llmPrototypeState === 'onPrem';

  // Match graph node chips: triggers → accent, Actions → primary/code.
  const triggerChip = {
    background: euiTheme.colors.backgroundBaseAccent,
    border: euiTheme.colors.borderBaseAccent,
    iconColor: euiTheme.colors.textAccent,
  };
  const actionChip = {
    background: euiTheme.colors.backgroundBasePrimary,
    border: euiTheme.colors.borderBasePrimary,
    iconColor: euiTheme.colors.textPrimary,
  };

  const libraryEnabled = useLibraryEnabled();
  const {
    recommendations,
    isLoading: isRecommendationsLoading,
    isError: isRecommendationsError,
  } = useRecommendedTemplates();

  const canGenerate = prompt.trim().length > 0;

  const handleGenerate = useCallback(() => {
    const trimmed = prompt.trim();
    if (!trimmed) return;
    onGenerateWithAi(trimmed);
  }, [onGenerateWithAi, prompt]);

  const handleSelectTemplate = useCallback(
    async (template: Template) => {
      if (isApplyingTemplate) return;
      setIsApplyingTemplate(true);
      try {
        const body = await api.getTemplate(template.slug);
        const setupFields = body.metadata.install?.form ?? [];
        // No Setup form → apply straight to the graph; skip the detail pane.
        if (setupFields.length === 0) {
          onApplyTemplateYaml(renderTemplate({ template: body }));
          return;
        }
        setInstallSlug(template.slug);
      } catch (error) {
        notifications.toasts.addDanger({
          title: i18n.translate('workflows.creationPanel.templateLoadFailed', {
            defaultMessage: 'Could not load template',
          }),
          text: error instanceof Error ? error.message : String(error),
        });
      } finally {
        setIsApplyingTemplate(false);
      }
    },
    [api, isApplyingTemplate, onApplyTemplateYaml, notifications.toasts]
  );

  const handleApplyFromDetail = useCallback(
    (yaml: string) => {
      onApplyTemplateYaml(yaml);
      setInstallSlug(null);
    },
    [onApplyTemplateYaml]
  );

  const handleBackFromTemplate = useCallback(() => {
    setInstallSlug(null);
  }, []);

  if (installSlug) {
    return (
      <div
        css={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          pointerEvents: 'auto',
          background: euiTheme.colors.backgroundBasePlain,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          overflow: 'hidden',
          padding: `${euiTheme.size.s} ${euiTheme.size.s} ${euiTheme.size.s} ${euiTheme.size.l}`,
        }}
        data-test-subj="workflowCreationPanelTemplateDetail"
      >
        <TemplateDetail
          slug={installSlug}
          showGraphPreview={showGraphPreview}
          onApplyToWorkflow={handleApplyFromDetail}
          backButton={
            <EuiButtonEmpty
              size="xs"
              flush="left"
              iconType="chevronSingleLeft"
              onClick={handleBackFromTemplate}
              data-test-subj="workflowCreationPanelTemplateDetailBack"
            >
              <FormattedMessage
                id="workflows.creationPanel.backToCreate"
                defaultMessage="Back to create"
              />
            </EuiButtonEmpty>
          }
        />
      </div>
    );
  }

  return (
    <div
      css={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        paddingTop: '9vh',
        paddingBottom: euiTheme.size.xxl,
        overflow: 'auto',
        pointerEvents: 'none',
        zIndex: 1,
      }}
      data-test-subj="workflowCreationPanel"
    >
      {/* Prototype showcase control — top center of the empty canvas. */}
      <div
        css={{
          position: 'absolute',
          top: euiTheme.size.m,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 2,
          pointerEvents: 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: euiTheme.size.xs,
        }}
        data-test-subj="workflowCreationPanelLlmPrototype"
      >
        <EuiText size="xs" color="subdued">
          <FormattedMessage
            id="workflows.creationPanel.llmPrototype.label"
            defaultMessage="Prototype · LLM state"
          />
        </EuiText>
        <EuiButtonGroup
          legend={i18n.translate('workflows.creationPanel.llmPrototype.legend', {
            defaultMessage: 'Prototype LLM availability',
          })}
          options={LLM_PROTOTYPE_OPTIONS}
          idSelected={llmPrototypeState}
          onChange={(id) => setLlmPrototypeState(id as LlmPrototypeState)}
          buttonSize="compressed"
          color="primary"
        />
      </div>

      <div
        css={{
          width: 720,
          maxWidth: '94vw',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          pointerEvents: 'auto',
          gap: euiTheme.size.l,
        }}
      >
        {showAiPrompt ? (
          <EuiFlexGroup direction="column" gutterSize="m" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiText textAlign="center">
                <h2 css={{ margin: 0, fontSize: euiTheme.size.l, fontWeight: 700 }}>
                  <FormattedMessage
                    id="workflows.creationPanel.aiTitle"
                    defaultMessage="What do you want to automate?"
                  />
                </h2>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <div
                role="group"
                aria-label={i18n.translate('workflows.creationPanel.aiInputGroup', {
                  defaultMessage: 'Describe a workflow to generate',
                })}
                onMouseDown={(e) => {
                  // Clicking chrome (not the submit button) focuses the field.
                  if (
                    e.target instanceof Element &&
                    e.target.closest('button') == null &&
                    document.activeElement !== promptInputRef.current
                  ) {
                    e.preventDefault();
                    promptInputRef.current?.focus();
                  }
                }}
                css={[
                  {
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: euiTheme.size.s,
                    background: euiTheme.colors.backgroundBasePlain,
                    border: `1px solid ${euiTheme.colors.borderBasePlain}`,
                    borderRadius: euiTheme.border.radius.medium,
                    padding: euiTheme.size.m,
                    cursor: 'text',
                    '&:focus-within': {
                      borderColor: euiTheme.colors.borderBasePrimary,
                    },
                  },
                  panelShadow,
                ]}
              >
                <textarea
                  ref={promptInputRef}
                  value={prompt}
                  rows={4}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    // Cmd/Ctrl+Enter submits; plain Enter inserts a newline.
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      handleGenerate();
                    }
                  }}
                  placeholder={i18n.translate('workflows.creationPanel.aiPlaceholder', {
                    defaultMessage:
                      'For example: For each alert with high severity, send a Slack message to #security-alerts',
                  })}
                  aria-label={i18n.translate('workflows.creationPanel.aiInputAria', {
                    defaultMessage: 'Workflow description',
                  })}
                  data-test-subj="workflowCreationPanelAiInput"
                  css={{
                    flex: 1,
                    minWidth: 0,
                    minHeight: 88,
                    resize: 'vertical',
                    appearance: 'none',
                    WebkitAppearance: 'none',
                    border: 'none',
                    background: 'transparent',
                    boxShadow: 'none',
                    padding: 0,
                    margin: 0,
                    font: 'inherit',
                    fontSize: euiTheme.size.m,
                    lineHeight: 1.5,
                    color: euiTheme.colors.textParagraph,
                    // Focus chrome lives only on the outer shell (`:focus-within`).
                    outline: 'none !important',
                    '&:focus, &:focus-visible, &:focus-within': {
                      outline: 'none !important',
                      boxShadow: 'none !important',
                      border: 'none',
                      background: 'transparent',
                    },
                    '::placeholder': {
                      color: euiTheme.colors.textSubdued,
                    },
                  }}
                />
                <EuiToolTip
                  content={i18n.translate('workflows.creationPanel.aiGenerate', {
                    defaultMessage: 'Generate workflow',
                  })}
                  disableScreenReaderOutput
                >
                  <EuiButtonIcon
                    // Match Agent Builder conversation submit affordance.
                    iconType="sortUp"
                    display="fill"
                    size="s"
                    aria-label={i18n.translate('workflows.creationPanel.aiGenerate', {
                      defaultMessage: 'Generate workflow',
                    })}
                    onClick={handleGenerate}
                    isDisabled={!canGenerate}
                    data-test-subj="workflowCreationPanelAiGo"
                    css={{ alignSelf: 'flex-end', flexShrink: 0 }}
                  />
                </EuiToolTip>
              </div>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="s" wrap responsive={false}>
                {AI_EXAMPLES.map((example) => (
                  <EuiFlexItem grow={false} key={example.text}>
                    <button
                      type="button"
                      data-test-subj="workflowCreationPanelAiExample"
                      onClick={() => setPrompt(example.text)}
                      css={{
                        border: `${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBasePlain}`,
                        background: euiTheme.colors.backgroundBasePlain,
                        borderRadius: 12,
                        padding: `${euiTheme.size.xs} ${euiTheme.size.m}`,
                        fontSize: euiTheme.size.m,
                        color: euiTheme.colors.textSubdued,
                        cursor: 'pointer',
                        '&:hover': {
                          borderColor: euiTheme.colors.borderBasePrimary,
                          color: euiTheme.colors.textPrimary,
                          background: euiTheme.colors.backgroundBasePrimary,
                        },
                      }}
                    >
                      {example.text}
                    </button>
                  </EuiFlexItem>
                ))}
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : (
          <EuiFlexGroup direction="column" gutterSize="m" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiText textAlign="center">
                <h2 css={{ margin: 0, fontSize: euiTheme.size.l, fontWeight: 700 }}>
                  <FormattedMessage
                    id="workflows.creationPanel.startTitle"
                    defaultMessage="How should this workflow start?"
                  />
                </h2>
              </EuiText>
            </EuiFlexItem>
            {(showMissingNudge || showOnPremNudge) && (
              <EuiFlexItem grow={false}>
                <div
                  css={[
                    {
                      display: 'flex',
                      alignItems: 'center',
                      gap: euiTheme.size.s,
                      fontSize: euiTheme.size.m,
                      color: euiTheme.colors.textSubdued,
                      background: euiTheme.colors.backgroundBasePlain,
                      border: `${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBasePlain}`,
                      borderRadius: euiTheme.border.radius.medium,
                      // Match the LLM-connected prompt shell padding + shadow.
                      padding: euiTheme.size.m,
                    },
                    panelShadow,
                  ]}
                  data-test-subj={
                    showOnPremNudge
                      ? 'workflowCreationPanelAiNudgeOnPrem'
                      : 'workflowCreationPanelAiNudge'
                  }
                >
                  <AiIcon iconType="sparkles" size="m" aria-hidden />
                  <span css={{ flex: 1 }}>
                    {showOnPremNudge ? (
                      <FormattedMessage
                        id="workflows.creationPanel.aiNudgeOnPrem"
                        defaultMessage="Generate workflows from a description — configure an on-premises LLM connector to enable. Contact your administrator if you need access."
                      />
                    ) : (
                      <FormattedMessage
                        id="workflows.creationPanel.aiNudge"
                        defaultMessage="Generate workflows from a description — {connectLink}"
                        values={{
                          connectLink: (
                            <EuiLink
                              href={llmConnectorsHref}
                              data-test-subj="workflowCreationPanelAiNudgeConnectLlm"
                            >
                              <FormattedMessage
                                id="workflows.creationPanel.aiNudge.connectLlm"
                                defaultMessage="connect an LLM to enable"
                              />
                            </EuiLink>
                          ),
                        }}
                      />
                    )}
                  </span>
                </div>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        )}

        <div
          css={[
            {
              background: euiTheme.colors.backgroundBasePlain,
              border: `1px solid ${euiTheme.colors.borderBasePlain}`,
              borderRadius: euiTheme.border.radius.medium,
              padding: euiTheme.size.base,
            },
            panelShadow,
          ]}
        >
          <EuiText size="s" css={{ fontWeight: 600, marginBottom: euiTheme.size.s }}>
            <FormattedMessage
              id="workflows.creationPanel.startWithTrigger"
              defaultMessage="Start with a trigger"
            />
          </EuiText>
          <div
            data-test-subj="workflowCreationPanelTriggers"
            css={{
              display: 'flex',
              flexDirection: 'column',
              gap: euiTheme.size.s,
            }}
          >
            {TRIGGER_CARDS.map((card) => (
              <button
                key={card.type}
                type="button"
                data-test-subj={`workflowCreationPanelTrigger-${card.type}`}
                onClick={() => onPickTrigger(card.type)}
                css={{
                  width: '100%',
                  minWidth: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: euiTheme.size.m,
                  textAlign: 'left',
                  background: euiTheme.colors.backgroundBasePlain,
                  border: `${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBasePlain}`,
                  borderRadius: euiTheme.border.radius.medium,
                  padding: `${euiTheme.size.m} ${euiTheme.size.m}`,
                  cursor: 'pointer',
                  '&:hover': {
                    borderColor: euiTheme.colors.borderBaseProminent,
                    background: euiTheme.colors.backgroundBaseSubdued,
                  },
                }}
              >
                <div
                  css={{
                    width: 34,
                    height: 34,
                    borderRadius: euiTheme.border.radius.small,
                    background: triggerChip.background,
                    border: `1px solid ${triggerChip.border}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flex: '0 0 auto',
                    color: triggerChip.iconColor,
                    '& svg, & svg *': { fill: triggerChip.iconColor },
                  }}
                >
                  <StepIcon
                    stepType={card.type}
                    executionStatus={undefined}
                    size="m"
                    color={triggerChip.iconColor}
                    iconColor={triggerChip.iconColor}
                  />
                </div>
                <span css={{ minWidth: 0, flex: 1 }}>
                  <span
                    css={{
                      display: 'block',
                      fontWeight: 600,
                      color: euiTheme.colors.textHeading,
                    }}
                  >
                    {card.title}
                  </span>
                  <span
                    css={{
                      display: 'block',
                      fontSize: euiTheme.size.m,
                      color: euiTheme.colors.textSubdued,
                    }}
                  >
                    {card.description}
                  </span>
                </span>
              </button>
            ))}
          </div>

          <EuiText
            size="s"
            css={{ fontWeight: 600, marginTop: euiTheme.size.base, marginBottom: euiTheme.size.s }}
          >
            <FormattedMessage
              id="workflows.creationPanel.orPickAction"
              defaultMessage="Or pick an action"
            />
          </EuiText>
          <button
            type="button"
            data-test-subj="workflowCreationPanelPickAction"
            onClick={(e) => onPickAction(e.currentTarget.getBoundingClientRect())}
            css={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: euiTheme.size.m,
              textAlign: 'left',
              background: euiTheme.colors.backgroundBasePlain,
              border: `${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBasePlain}`,
              borderRadius: euiTheme.border.radius.medium,
              padding: `${euiTheme.size.m} ${euiTheme.size.m}`,
              cursor: 'pointer',
              '&:hover': {
                borderColor: euiTheme.colors.borderBaseProminent,
                background: euiTheme.colors.backgroundBaseSubdued,
              },
            }}
          >
            <div
              css={{
                width: 34,
                height: 34,
                borderRadius: euiTheme.border.radius.small,
                background: actionChip.background,
                border: `1px solid ${actionChip.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flex: '0 0 auto',
              }}
            >
              <EuiIcon type="grid" color={actionChip.iconColor} aria-hidden={true} />
            </div>
            <span css={{ minWidth: 0, flex: 1 }}>
              <span css={{ display: 'block', fontWeight: 600, color: euiTheme.colors.textHeading }}>
                <FormattedMessage
                  id="workflows.creationPanel.actionsTitle"
                  defaultMessage="Actions"
                />
              </span>
              <span
                css={{
                  display: 'block',
                  fontSize: euiTheme.size.m,
                  color: euiTheme.colors.textSubdued,
                }}
              >
                <FormattedMessage
                  id="workflows.creationPanel.actionsDesc"
                  defaultMessage="Start from an action — add its trigger after"
                />
              </span>
            </span>
            <EuiIcon type="chevronSingleRight" color="subdued" aria-hidden={true} />
          </button>
        </div>

        {libraryEnabled && (
          <div data-test-subj="workflowCreationPanelTemplates">
            <EuiFlexGroup
              alignItems="baseline"
              justifyContent="spaceBetween"
              gutterSize="s"
              responsive={false}
            >
              <EuiFlexItem grow={false}>
                <EuiText size="s" css={{ fontWeight: 600 }}>
                  <FormattedMessage
                    id="workflows.creationPanel.recommendedTemplates"
                    defaultMessage="Recommended templates"
                  />
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  size="xs"
                  flush="right"
                  onClick={onBrowseTemplates}
                  data-test-subj="workflowCreationPanelBrowseTemplates"
                >
                  <FormattedMessage
                    id="workflows.creationPanel.checkAllTemplates"
                    defaultMessage="Check all templates →"
                  />
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
            {isRecommendationsLoading ? (
              <div
                css={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                  gap: euiTheme.size.s,
                  marginTop: euiTheme.size.s,
                }}
                data-test-subj="workflowCreationPanelTemplatesLoading"
              >
                {[0, 1, 2].map((index) => (
                  <EuiSkeletonRectangle
                    key={index}
                    height={120}
                    width="100%"
                    borderRadius="m"
                  />
                ))}
              </div>
            ) : !isRecommendationsError && recommendations.length > 0 ? (
              <div
                css={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${Math.min(recommendations.length, 3)}, minmax(0, 1fr))`,
                  gap: euiTheme.size.s,
                  marginTop: euiTheme.size.s,
                }}
              >
                {recommendations.map(({ template, reason }) => (
                  <RecommendedTemplateCard
                    key={template.slug}
                    template={template}
                    reason={reason}
                    onSelect={handleSelectTemplate}
                    data-test-subj={`workflowCreationPanelTemplate-${template.slug}`}
                  />
                ))}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
