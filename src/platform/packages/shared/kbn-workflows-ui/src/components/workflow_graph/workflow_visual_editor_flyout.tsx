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
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import { CodeEditor } from '@kbn/code-editor';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { StepInfo } from '@kbn/workflows-yaml';
import { deslugifyStepName } from './deslugify_step_name';
import type { RenderStepIcon } from './workflow_graph_actions_context';
import {
  useWorkflowsMonacoTheme,
  WORKFLOWS_MONACO_EDITOR_THEME,
} from '../../hooks/use_workflows_monaco_theme';
import { TypeIcon } from '../step_icons';

export type WorkflowVisualEditorFlyoutTarget =
  | {
      kind: 'step';
      stepName: string;
      stepType?: string;
      stepInfo?: StepInfo;
      yamlSnippet?: string;
    }
  | {
      kind: 'trigger';
      triggerType: string;
      triggerLabel: string;
      yamlSnippet: string;
    };

export interface WorkflowVisualEditorFlyoutProps {
  readonly target: WorkflowVisualEditorFlyoutTarget;
  readonly editorYaml: string;
  readonly canExecuteWorkflow: boolean;
  readonly isYamlValid: boolean;
  readonly onClose: () => void;
  readonly onOpenInYaml?: () => void;
  readonly onRunStep?: () => void;
  readonly renderMoreMenuItems?: (closeMenu: () => void) => JSX.Element[];
  readonly onMoreMenuOpen?: () => void;
  readonly renderStepIcon?: RenderStepIcon;
}

function extractYamlSlice(editorYaml: string, stepInfo: StepInfo | undefined): string {
  if (!stepInfo) return '';
  const lines = editorYaml.split('\n');
  return lines.slice(Math.max(0, stepInfo.lineStart - 1), stepInfo.lineEnd).join('\n');
}

export function WorkflowVisualEditorFlyout({
  target,
  editorYaml,
  canExecuteWorkflow,
  isYamlValid,
  onClose,
  onOpenInYaml,
  onRunStep,
  renderMoreMenuItems,
  onMoreMenuOpen,
  renderStepIcon,
}: WorkflowVisualEditorFlyoutProps) {
  // Register the workflows Monaco theme so the CodeEditor below renders with
  // the same colors as the main YAML editor.
  useWorkflowsMonacoTheme();
  const { euiTheme } = useEuiTheme();
  const isTrigger = target.kind === 'trigger';
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const closeMenu = useCallback(() => setIsMenuOpen(false), []);
  const openMenu = useCallback(() => {
    onMoreMenuOpen?.();
    setIsMenuOpen(true);
  }, [onMoreMenuOpen]);

  // Display-only, mirrors workflow_graph_node.tsx: `target.stepName`/`stepInfo.stepId`
  // are raw step names and must stay untouched elsewhere (e.g. YAML lookups).
  // Trigger labels are already human-readable (getTriggerLabel), so left as-is.
  const title =
    target.kind === 'step'
      ? deslugifyStepName(target.stepInfo?.stepId ?? target.stepName)
      : target.triggerLabel;
  const subtitle =
    target.kind === 'step'
      ? target.stepInfo?.stepType ?? target.stepType
      : `trigger / ${target.triggerType}`;
  const iconStepType =
    target.kind === 'step'
      ? target.stepInfo?.stepType ?? target.stepType ?? 'package'
      : target.triggerType;

  const yamlSlice = useMemo(() => {
    if (target.kind === 'trigger') return target.yamlSnippet;
    return target.yamlSnippet ?? extractYamlSlice(editorYaml, target.stepInfo);
  }, [target, editorYaml]);
  const moreMenuItems = useMemo(
    () => renderMoreMenuItems?.(closeMenu) ?? [],
    [closeMenu, renderMoreMenuItems]
  );

  const hasRunAction = Boolean(onRunStep);
  const hasMoreActions = Boolean(renderMoreMenuItems);
  const hasHeaderActions = hasRunAction || hasMoreActions;
  const runDisabled = isTrigger || !canExecuteWorkflow || !isYamlValid;
  const moreActionsLabel = i18n.translate('workflows.visualEditor.flyout.more', {
    defaultMessage: 'More actions',
  });
  const closeLabel = i18n.translate('workflows.visualEditor.flyout.close', {
    defaultMessage: 'Close',
  });
  const runDisabledReason = isTrigger
    ? i18n.translate('workflows.visualEditor.flyout.runDisabledTrigger', {
        defaultMessage: 'Triggers cannot be run individually.',
      })
    : !canExecuteWorkflow
    ? i18n.translate('workflows.visualEditor.flyout.runDisabledNoCapability', {
        defaultMessage: 'You do not have permission to run workflows.',
      })
    : !isYamlValid
    ? i18n.translate('workflows.visualEditor.flyout.runDisabledInvalidYaml', {
        defaultMessage: 'Fix YAML errors to run this step.',
      })
    : i18n.translate('workflows.visualEditor.flyout.runStep', {
        defaultMessage: 'Run step',
      });

  return (
    <div
      data-test-subj="workflowVisualEditorFlyout"
      css={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: euiTheme.colors.backgroundBasePlain,
        borderRadius: 8,
        overflow: 'hidden',
        border: `1px solid ${euiTheme.colors.borderBasePlain}`,
      }}
    >
      <div
        css={{
          height: 76,
          padding: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          borderBottom: `1px solid ${euiTheme.colors.borderBasePlain}`,
          flexShrink: 0,
        }}
      >
        <EuiFlexGroup
          alignItems="center"
          gutterSize="m"
          responsive={false}
          css={{ minWidth: 0, flex: '1 1 auto' }}
        >
          <EuiFlexItem grow={false}>
            <div
              css={{
                width: 40,
                height: 40,
                // Same light-gray inner-box stroke the graph step uses
                // (Figma FIGMA_STEP_INNER_BOX_BORDER) so the flyout header
                // visually echoes the row that opened it.
                border: `1px solid #e4e7f1`,
                borderRadius: 8,
                background: euiTheme.colors.backgroundBasePlain,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {renderStepIcon ? (
                renderStepIcon({ stepType: iconStepType, isTrigger, size: 'm' })
              ) : (
                <TypeIcon type={iconStepType} kind={isTrigger ? 'trigger' : 'step'} size="m" />
              )}
            </div>
          </EuiFlexItem>
          <EuiFlexItem css={{ minWidth: 0 }}>
            <div
              css={{
                fontFamily: euiTheme.font.family,
                fontSize: 14,
                fontWeight: 600,
                lineHeight: '20px',
                color: euiTheme.colors.textHeading,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
              title={title}
            >
              {title}
            </div>
            {subtitle && (
              <div
                css={{
                  fontFamily: euiTheme.font.family,
                  fontSize: 12,
                  fontWeight: 400,
                  lineHeight: '20px',
                  color: euiTheme.colors.textSubdued,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
                title={subtitle}
              >
                {subtitle}
              </div>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiFlexGroup
          alignItems="center"
          gutterSize="s"
          responsive={false}
          css={{ flex: '0 0 auto', marginLeft: 'auto' }}
        >
          {hasRunAction ? (
            <EuiFlexItem grow={false}>
              <EuiToolTip content={runDisabledReason}>
                <EuiButtonIcon
                  iconType="play"
                  color="text"
                  size="s"
                  onClick={onRunStep}
                  isDisabled={runDisabled}
                  aria-label={i18n.translate('workflows.visualEditor.flyout.runStep.aria', {
                    defaultMessage: 'Run step',
                  })}
                  data-test-subj="workflowVisualEditorFlyoutRunStep"
                />
              </EuiToolTip>
            </EuiFlexItem>
          ) : null}
          {hasMoreActions ? (
            <EuiFlexItem grow={false}>
              <EuiPopover
                aria-label={moreActionsLabel}
                isOpen={isMenuOpen}
                closePopover={closeMenu}
                panelPaddingSize="none"
                anchorPosition="downRight"
                button={
                  <EuiToolTip content={moreActionsLabel} disableScreenReaderOutput>
                    <EuiButtonIcon
                      iconType="boxesHorizontal"
                      color="text"
                      size="s"
                      aria-label={moreActionsLabel}
                      onClick={() => (isMenuOpen ? closeMenu() : openMenu())}
                      isDisabled={!moreMenuItems?.length}
                      data-test-subj="workflowVisualEditorFlyoutMore"
                    />
                  </EuiToolTip>
                }
              >
                <EuiContextMenuPanel items={moreMenuItems ?? []} />
              </EuiPopover>
            </EuiFlexItem>
          ) : null}
          {hasHeaderActions ? (
            <EuiFlexItem
              grow={false}
              css={{
                width: 1,
                height: 32,
                background: euiTheme.colors.borderBasePlain,
                margin: '0 4px',
              }}
            />
          ) : null}
          <EuiFlexItem grow={false}>
            <EuiToolTip content={closeLabel} disableScreenReaderOutput>
              <EuiButtonIcon
                iconType="cross"
                color="text"
                size="s"
                onClick={onClose}
                aria-label={closeLabel}
                data-test-subj="workflowVisualEditorFlyoutClose"
              />
            </EuiToolTip>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>

      <div
        css={{
          flex: '1 1 auto',
          overflow: 'hidden',
          background: euiTheme.colors.backgroundBaseSubdued,
        }}
        data-test-subj="workflowVisualEditorFlyoutYamlSlice"
      >
        {yamlSlice ? (
          <CodeEditor
            languageId="yaml"
            value={yamlSlice}
            height="100%"
            width="100%"
            options={{
              readOnly: true,
              lineNumbers: 'on',
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              folding: false,
              fontSize: 12,
              renderLineHighlight: 'none',
              theme: WORKFLOWS_MONACO_EDITOR_THEME,
              padding: { top: 12, bottom: 12 },
            }}
          />
        ) : (
          <div css={{ padding: 16 }}>
            <EuiText size="s" color="subdued">
              <FormattedMessage
                id="workflows.visualEditor.flyout.unavailable"
                defaultMessage="Step details unavailable. The YAML may have errors."
              />
            </EuiText>
          </div>
        )}
      </div>

      {onOpenInYaml ? (
        <div
          css={{
            height: 53,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderTop: `1px solid ${euiTheme.colors.borderBasePlain}`,
            flexShrink: 0,
            background: euiTheme.colors.backgroundBasePlain,
          }}
        >
          <EuiButtonEmpty
            size="m"
            iconType="plusInCircle"
            onClick={onOpenInYaml}
            data-test-subj="workflowVisualEditorFlyoutOpenInYaml"
          >
            <FormattedMessage
              id="workflows.visualEditor.flyout.openInYaml"
              defaultMessage="Open in YAML editor"
            />
          </EuiButtonEmpty>
        </div>
      ) : null}
    </div>
  );
}
