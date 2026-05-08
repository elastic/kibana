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
  EuiButton,
  EuiButtonEmpty,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { StepInfo } from '@kbn/workflows-yaml';

export type FlyoutTarget =
  | { kind: 'step'; stepName: string; stepInfo?: StepInfo }
  | {
      kind: 'trigger';
      triggerType: string;
      triggerLabel: string;
      yamlSnippet: string;
    };

interface Props {
  target: FlyoutTarget;
  editorYaml: string;
  canExecuteWorkflow: boolean;
  isYamlValid: boolean;
  onClose: () => void;
  onOpenInYaml: () => void;
  onRunStep: () => void;
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
}: Props) {
  const isTrigger = target.kind === 'trigger';

  const headerTitle =
    target.kind === 'step' ? target.stepInfo?.stepId ?? target.stepName : target.triggerLabel;
  const headerType =
    target.kind === 'step' ? target.stepInfo?.stepType : `trigger / ${target.triggerType}`;

  const yamlSlice = useMemo(() => {
    if (target.kind === 'trigger') return target.yamlSnippet;
    return extractYamlSlice(editorYaml, target.stepInfo);
  }, [target, editorYaml]);

  const lineRange =
    target.kind === 'step' && target.stepInfo
      ? { start: target.stepInfo.lineStart, end: target.stepInfo.lineEnd }
      : null;

  const runDisabled = isTrigger || !canExecuteWorkflow || !isYamlValid;
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
    : undefined;

  return (
    <EuiFlyout
      ownFocus={false}
      type="push"
      size="s"
      onClose={onClose}
      pushMinBreakpoint="s"
      data-test-subj="workflowVisualEditorFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2>{headerTitle}</h2>
        </EuiTitle>
        {headerType && (
          <>
            <EuiSpacer size="xs" />
            <EuiBadge color="hollow">{headerType}</EuiBadge>
          </>
        )}
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {yamlSlice ? (
          <>
            {lineRange && (
              <>
                <EuiText size="xs" color="subdued">
                  <FormattedMessage
                    id="workflows.visualEditor.flyout.linesLabel"
                    defaultMessage="Lines {start}–{end}"
                    values={{ start: lineRange.start, end: lineRange.end }}
                  />
                </EuiText>
                <EuiSpacer size="s" />
              </>
            )}
            <EuiCodeBlock
              language="yaml"
              fontSize="s"
              paddingSize="s"
              isCopyable
              overflowHeight={420}
              data-test-subj="workflowVisualEditorFlyoutYamlSlice"
            >
              {yamlSlice}
            </EuiCodeBlock>
            <EuiSpacer size="m" />
            <EuiButtonEmpty
              size="s"
              iconType="editorCodeBlock"
              onClick={onOpenInYaml}
              data-test-subj="workflowVisualEditorFlyoutOpenInYaml"
            >
              <FormattedMessage
                id="workflows.visualEditor.flyout.openInYaml"
                defaultMessage="Open in YAML editor"
              />
            </EuiButtonEmpty>
          </>
        ) : (
          <EuiText size="s" color="subdued">
            <FormattedMessage
              id="workflows.visualEditor.flyout.unavailable"
              defaultMessage="Step details unavailable. The YAML may have errors."
            />
          </EuiText>
        )}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose}>
              <FormattedMessage id="workflows.visualEditor.flyout.close" defaultMessage="Close" />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiToolTip content={runDisabledReason}>
              <EuiButton
                fill
                iconType="play"
                isDisabled={runDisabled}
                onClick={onRunStep}
                data-test-subj="workflowVisualEditorFlyoutRunStep"
              >
                <FormattedMessage
                  id="workflows.visualEditor.flyout.runStep"
                  defaultMessage="Run step"
                />
              </EuiButton>
            </EuiToolTip>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
}
