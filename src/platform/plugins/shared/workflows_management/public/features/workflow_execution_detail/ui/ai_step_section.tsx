/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiHorizontalRule, EuiLink, EuiText, useEuiTheme } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { StepDetailAccordionSection } from './step_detail_accordion_section';
import { useKibana } from '../../../hooks/use_kibana';
import { TokenUsageBreakdown } from '../../../shared/ui/token_usage_badge/token_usage_breakdown';
import type { StepAiMetadata } from '../lib/normalize_step_ai';
import { stepAiToTokenUsage } from '../lib/normalize_step_ai';

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

  const usage = stepAiToTokenUsage(ai);
  const hasContext =
    Boolean(ai.model) ||
    Boolean(connectorName || ai.connectorId) ||
    ai.timeToFirstTokenMs !== undefined;

  const connectorHref =
    ai.connectorId != null
      ? application.getUrlForApp('management', {
          path: `/insightsAndAlerting/triggersActionsConnectors/connectors/${ai.connectorId}`,
        })
      : undefined;

  return (
    <StepDetailAccordionSection
      data-test-subj="workflowExecutionAiSection"
      title={i18n.translate('workflows.executionFlyout.aiSection.label', {
        defaultMessage: 'AI',
      })}
    >
      <div
        css={{
          display: 'flex',
          flexDirection: 'column',
          gap: euiTheme.size.s,
        }}
      >
        {hasContext && (
          <div
            css={{
              display: 'grid',
              gridTemplateColumns: 'max-content minmax(0, 1fr)',
              columnGap: euiTheme.size.m,
              rowGap: '4px',
              alignItems: 'center',
            }}
          >
            {ai.model && (
              <div css={{ display: 'contents' }} data-test-subj="workflowExecutionAiSectionModel">
                <EuiText size="xs" color="subdued">
                  {i18n.translate('workflows.executionFlyout.aiSection.model', {
                    defaultMessage: 'Model',
                  })}
                </EuiText>
                <EuiText size="xs" css={{ fontFamily: euiTheme.font.familyCode, minWidth: 0 }}>
                  {ai.model}
                </EuiText>
              </div>
            )}
            {(connectorName || ai.connectorId) && (
              <div
                css={{ display: 'contents' }}
                data-test-subj="workflowExecutionAiSectionConnector"
              >
                <EuiText size="xs" color="subdued">
                  {i18n.translate('workflows.executionFlyout.aiSection.connector', {
                    defaultMessage: 'Connector',
                  })}
                </EuiText>
                <div css={{ minWidth: 0 }}>
                  {connectorHref ? (
                    <EuiLink
                      href={connectorHref}
                      target="_blank"
                      css={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <EuiText size="xs" component="span">
                        {connectorName ?? ai.connectorId}
                      </EuiText>
                    </EuiLink>
                  ) : (
                    <EuiText size="xs">{connectorName ?? ai.connectorId}</EuiText>
                  )}
                </div>
              </div>
            )}
            {ai.timeToFirstTokenMs !== undefined && (
              <div css={{ display: 'contents' }} data-test-subj="workflowExecutionAiSectionTtft">
                <EuiText size="xs" color="subdued">
                  {i18n.translate('workflows.executionFlyout.aiSection.ttft', {
                    defaultMessage: 'Time to first token',
                  })}
                </EuiText>
                <EuiText size="xs" css={{ minWidth: 0 }}>
                  {i18n.translate('workflows.executionFlyout.aiSection.ttftValue', {
                    defaultMessage: '{ms} ms',
                    values: { ms: Math.round(ai.timeToFirstTokenMs) },
                  })}
                </EuiText>
              </div>
            )}
          </div>
        )}

        {usage && (
          <div data-test-subj="workflowExecutionAiSectionTokenUsage">
            {hasContext && (
              <EuiHorizontalRule margin="none" css={{ marginBottom: euiTheme.size.s }} />
            )}
            <TokenUsageBreakdown
              usage={usage}
              // Model/connector are already listed above; only surface multi-call
              // aggregates in the shared footer.
              callCount={ai.callCount}
              data-test-subj="workflowTokenUsageBreakdown"
            />
          </div>
        )}
      </div>
    </StepDetailAccordionSection>
  );
});

AiStepSection.displayName = 'AiStepSection';
