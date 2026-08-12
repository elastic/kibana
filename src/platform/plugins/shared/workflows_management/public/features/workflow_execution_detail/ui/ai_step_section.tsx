/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiButtonIcon,
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiLink,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { StepAiMetadata } from '../lib/normalize_step_ai';
import { useKibana } from '../../../hooks/use_kibana';

const fullNumberFormatter = new Intl.NumberFormat();

const percentOf = (part: number, total: number): string => {
  if (total <= 0) return '0%';
  return `${Math.round((part / total) * 100)}%`;
};

interface AiStepSectionProps {
  ai: StepAiMetadata;
  connectorName?: string;
}

/**
 * Collapsible AI section for the step subflyout — fixed structure, no Table/JSON toggle.
 */
export const AiStepSection = React.memo<AiStepSectionProps>(({ ai, connectorName }) => {
  const { euiTheme } = useEuiTheme();
  const { application } = useKibana().services;
  const [isOpen, setIsOpen] = useState(true);

  const hasTokens =
    ai.totalTokens !== undefined ||
    ai.inputTokens !== undefined ||
    ai.outputTokens !== undefined;
  const inputTokens = ai.inputTokens ?? 0;
  const outputTokens = ai.outputTokens ?? 0;
  const totalTokens = ai.totalTokens ?? inputTokens + outputTokens;
  const hasSplit = ai.inputTokens !== undefined || ai.outputTokens !== undefined;

  const connectorHref =
    ai.connectorId != null
      ? application.getUrlForApp('management', {
          path: `/insightsAndAlerting/triggersActionsConnectors/connectors/${ai.connectorId}`,
        })
      : undefined;

  return (
    <div
      css={{ display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0 }}
      data-test-subj="workflowExecutionAiSection"
    >
      <div css={{ display: 'flex', alignItems: 'center', height: '32px', gap: '4px' }}>
        <EuiButtonIcon
          iconType={isOpen ? 'arrowUp' : 'arrowDown'}
          size="xs"
          color="text"
          aria-label={i18n.translate('workflows.executionFlyout.aiSection.toggle', {
            defaultMessage: 'AI section',
          })}
          onClick={() => setIsOpen((v) => !v)}
        />
        <span css={{ fontSize: '14px', fontWeight: 600, color: euiTheme.colors.title }}>
          {i18n.translate('workflows.executionFlyout.aiSection.label', {
            defaultMessage: 'AI',
          })}
        </span>
      </div>
      {isOpen && (
        <div
          css={{
            border: `1px solid ${euiTheme.colors.borderBaseSubdued}`,
            borderRadius: '6px',
            overflow: 'hidden',
            padding: '12px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: euiTheme.size.s,
          }}
        >
          {ai.model && (
            <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued">
                  {i18n.translate('workflows.executionFlyout.aiSection.model', {
                    defaultMessage: 'Model',
                  })}
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="xs" css={{ fontFamily: euiTheme.font.familyCode }}>
                  {ai.model}
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiCopy textToCopy={ai.model}>
                  {(copy) => (
                    <EuiButtonIcon
                      iconType="copy"
                      size="xs"
                      color="text"
                      aria-label={i18n.translate('workflows.executionFlyout.aiSection.copyModel', {
                        defaultMessage: 'Copy model',
                      })}
                      onClick={copy}
                    />
                  )}
                </EuiCopy>
              </EuiFlexItem>
            </EuiFlexGroup>
          )}
          {(connectorName || ai.connectorId) && (
            <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued">
                  {i18n.translate('workflows.executionFlyout.aiSection.connector', {
                    defaultMessage: 'Connector',
                  })}
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem>
                {connectorHref ? (
                  <EuiLink href={connectorHref} target="_blank">
                    <EuiText size="xs">{connectorName ?? ai.connectorId}</EuiText>
                  </EuiLink>
                ) : (
                  <EuiText size="xs">{connectorName ?? ai.connectorId}</EuiText>
                )}
              </EuiFlexItem>
            </EuiFlexGroup>
          )}
          {ai.timeToFirstTokenMs !== undefined && (
            <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued">
                  {i18n.translate('workflows.executionFlyout.aiSection.ttft', {
                    defaultMessage: 'Time to first token',
                  })}
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="xs">
                  {i18n.translate('workflows.executionFlyout.aiSection.ttftValue', {
                    defaultMessage: '{ms} ms',
                    values: { ms: Math.round(ai.timeToFirstTokenMs) },
                  })}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          )}
          {hasTokens && (
            <>
              <EuiHorizontalRule margin="none" />
              {ai.callCount != null && ai.callCount > 1 && (
                <EuiText size="xs" color="subdued">
                  {i18n.translate('workflows.executionFlyout.aiSection.modelCalls', {
                    defaultMessage: '{count} model calls',
                    values: { count: ai.callCount },
                  })}
                </EuiText>
              )}
              {hasSplit && (
                <>
                  <EuiFlexGroup justifyContent="spaceBetween" gutterSize="m" responsive={false}>
                    <EuiFlexItem grow={false}>
                      <EuiText size="xs">
                        {i18n.translate('workflows.executionFlyout.aiSection.inputTokens', {
                          defaultMessage: 'Input',
                        })}
                      </EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiText size="xs">
                        {fullNumberFormatter.format(inputTokens)} (
                        {percentOf(inputTokens, totalTokens)})
                      </EuiText>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                  <EuiFlexGroup justifyContent="spaceBetween" gutterSize="m" responsive={false}>
                    <EuiFlexItem grow={false}>
                      <EuiText size="xs">
                        {i18n.translate('workflows.executionFlyout.aiSection.outputTokens', {
                          defaultMessage: 'Output',
                        })}
                      </EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiText size="xs">
                        {fullNumberFormatter.format(outputTokens)} (
                        {percentOf(outputTokens, totalTokens)})
                      </EuiText>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </>
              )}
              <EuiFlexGroup justifyContent="spaceBetween" gutterSize="m" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiText size="xs">
                    <strong>
                      {i18n.translate('workflows.executionFlyout.aiSection.totalTokens', {
                        defaultMessage: 'Total',
                      })}
                    </strong>
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="xs">
                    <strong>{fullNumberFormatter.format(totalTokens)}</strong>
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
              {hasSplit && totalTokens > 0 && (
                <div
                  aria-hidden="true"
                  css={{
                    display: 'flex',
                    height: 4,
                    borderRadius: 2,
                    overflow: 'hidden',
                    background: euiTheme.colors.backgroundBaseSubdued,
                  }}
                >
                  <div
                    css={{
                      width: percentOf(inputTokens, totalTokens),
                      background: euiTheme.colors.backgroundFilledText,
                    }}
                  />
                  <div
                    css={{
                      width: percentOf(outputTokens, totalTokens),
                      background: euiTheme.colors.borderBaseSubdued,
                    }}
                  />
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
});

AiStepSection.displayName = 'AiStepSection';
