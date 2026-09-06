/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiFlexGroup, EuiFlexItem, EuiText, useEuiTheme } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import type { WorkflowTokenUsage } from '@kbn/workflows';

const fullNumberFormatter = new Intl.NumberFormat();

const percentOf = (part: number, total: number): number => {
  if (total <= 0) return 0;
  return Math.round((part / total) * 100);
};

export interface TokenUsageBreakdownProps {
  usage: WorkflowTokenUsage;
  /**
   * Leaf AI context: shown as "{model} · {connector}" below the bar.
   * Omit for parent/rollup aggregates (those use `callCount` instead).
   */
  model?: string;
  connectorName?: string;
  /**
   * Parent/rollup context: "{n} model calls" when > 1. Takes precedence over
   * the leaf model·connector footer so aggregates never name a single model.
   */
  callCount?: number;
  'data-test-subj'?: string;
}

/**
 * Shared token-usage presentation for the step AI section and badge popover.
 */
export const TokenUsageBreakdown = React.memo<TokenUsageBreakdownProps>(
  ({
    usage,
    model,
    connectorName,
    callCount,
    'data-test-subj': dataTestSubj = 'workflowTokenUsageBreakdown',
  }) => {
    const { euiTheme } = useEuiTheme();

    // TODO: Visual builder trigger nodes use `euiTheme.colors.accent` (not a vis
    // token). Prefer migrating the builder to `euiColorVis4` so both surfaces share
    // the same palette token; until then Vis4 is the nearest pink in the vis palette.
    const inputColor = euiTheme.colors.vis.euiColorVis4;
    // Saturated teal — darker/stronger than soft cyan companions (e.g. Vis1).
    const outputColor = euiTheme.colors.vis.euiColorVis0;

    const hasSplit = usage.inputTokens > 0 || usage.outputTokens > 0;
    const showCompositionBar = hasSplit && usage.totalTokens > 0;
    const inputPct = percentOf(usage.inputTokens, usage.totalTokens);
    const outputPct = percentOf(usage.outputTokens, usage.totalTokens);

    const showCalls = callCount != null && callCount > 1;
    const leafFooterParts = showCalls ? [] : [model, connectorName].filter(Boolean);

    return (
      <div data-test-subj={dataTestSubj} css={{ minWidth: 180 }}>
        <EuiText
          size="xs"
          css={{ fontWeight: euiTheme.font.weight.medium, marginBottom: euiTheme.size.xs }}
          data-test-subj={`${dataTestSubj}-heading`}
        >
          {i18n.translate('workflowsManagement.tokenUsage.breakdownHeading', {
            defaultMessage: 'Token usage',
          })}
        </EuiText>

        {hasSplit && (
          <>
            <EuiFlexGroup
              justifyContent="spaceBetween"
              alignItems="center"
              gutterSize="m"
              responsive={false}
              data-test-subj={`${dataTestSubj}-inputRow`}
            >
              <EuiFlexItem grow={false}>
                <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <span
                      aria-hidden="true"
                      data-test-subj={`${dataTestSubj}-inputSwatch`}
                      css={{
                        display: 'inline-block',
                        width: 8,
                        height: 8,
                        borderRadius: 2,
                        backgroundColor: inputColor,
                      }}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiText size="xs">
                      {i18n.translate('workflowsManagement.tokenUsage.inputLabel', {
                        defaultMessage: 'Input',
                      })}
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="xs">
                  {i18n.translate('workflowsManagement.tokenUsage.inputValue', {
                    defaultMessage: '{n} tokens ({pct}%)',
                    values: {
                      n: fullNumberFormatter.format(usage.inputTokens),
                      pct: inputPct,
                    },
                  })}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiFlexGroup
              justifyContent="spaceBetween"
              alignItems="center"
              gutterSize="m"
              responsive={false}
              data-test-subj={`${dataTestSubj}-outputRow`}
            >
              <EuiFlexItem grow={false}>
                <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <span
                      aria-hidden="true"
                      data-test-subj={`${dataTestSubj}-outputSwatch`}
                      css={{
                        display: 'inline-block',
                        width: 8,
                        height: 8,
                        borderRadius: 2,
                        backgroundColor: outputColor,
                      }}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiText size="xs">
                      {i18n.translate('workflowsManagement.tokenUsage.outputLabel', {
                        defaultMessage: 'Output',
                      })}
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="xs">
                  {i18n.translate('workflowsManagement.tokenUsage.outputValue', {
                    defaultMessage: '{n} tokens ({pct}%)',
                    values: {
                      n: fullNumberFormatter.format(usage.outputTokens),
                      pct: outputPct,
                    },
                  })}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </>
        )}

        <EuiFlexGroup
          justifyContent="spaceBetween"
          alignItems="center"
          gutterSize="m"
          responsive={false}
          css={
            hasSplit
              ? {
                  borderTop: euiTheme.border.thin,
                  paddingTop: euiTheme.size.xs,
                  marginTop: euiTheme.size.xs,
                }
              : undefined
          }
          data-test-subj={`${dataTestSubj}-totalRow`}
        >
          <EuiFlexItem grow={false}>
            <EuiText size="xs">
              <strong>
                {i18n.translate('workflowsManagement.tokenUsage.totalLabel', {
                  defaultMessage: 'Total',
                })}
              </strong>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="xs">
              <strong>
                {i18n.translate('workflowsManagement.tokenUsage.totalValue', {
                  defaultMessage: '{n} tokens',
                  values: { n: fullNumberFormatter.format(usage.totalTokens) },
                })}
              </strong>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>

        {showCompositionBar && (
          <div
            aria-hidden="true"
            data-test-subj={`${dataTestSubj}-compositionBar`}
            css={{
              display: 'flex',
              height: 6,
              marginTop: euiTheme.size.s,
              borderRadius: 3,
              overflow: 'hidden',
            }}
          >
            <div
              css={{
                width: `${inputPct}%`,
                background: inputColor,
              }}
            />
            <div
              css={{
                width: `${outputPct}%`,
                background: outputColor,
              }}
            />
          </div>
        )}

        {showCalls && (
          <EuiText
            size="xs"
            color="subdued"
            css={{ marginTop: euiTheme.size.xs }}
            data-test-subj={`${dataTestSubj}-footer`}
          >
            {i18n.translate('workflowsManagement.tokenUsage.modelCalls', {
              defaultMessage: '{count} model calls',
              values: { count: callCount },
            })}
          </EuiText>
        )}
        {!showCalls && leafFooterParts.length > 0 && (
          <EuiText
            size="xs"
            color="subdued"
            css={{
              marginTop: euiTheme.size.xs,
              fontFamily: euiTheme.font.familyCode,
            }}
            data-test-subj={`${dataTestSubj}-footer`}
          >
            {leafFooterParts.join(' · ')}
          </EuiText>
        )}
      </div>
    );
  }
);

TokenUsageBreakdown.displayName = 'TokenUsageBreakdown';
