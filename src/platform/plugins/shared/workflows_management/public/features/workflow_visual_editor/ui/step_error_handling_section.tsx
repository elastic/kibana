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
  EuiFieldNumber,
  EuiFieldText,
  EuiFormRow,
  EuiIcon,
  EuiLink,
  EuiSwitch,
  EuiText,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import { isMap, parseDocument, type YAMLMap } from 'yaml';
import { i18n } from '@kbn/i18n';

export interface FallbackStepChip {
  readonly name: string;
}

export interface StepErrorHandlingSectionProps {
  readonly fragment: string;
  readonly indent: number;
  readonly onFragmentChange: (next: string) => void;
  /** Momentarily reveal/pulse the owning node's error port on the canvas. */
  readonly onRevealErrorPort?: () => void;
  /** Select/center a fallback step on the canvas (read-only discovery). */
  readonly onViewFallbackOnCanvas?: (stepName: string) => void;
}

const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_DELAY = '5s';

const toJs = (value: unknown): unknown =>
  value !== null && typeof value === 'object' && 'toJSON' in (value as object)
    ? (value as { toJSON: () => unknown }).toJSON()
    : value;

const readOnFailure = (
  fragment: string
): {
  retryEnabled: boolean;
  maxAttempts: number;
  delay: string;
  continueOnFailure: boolean;
  fallbacks: FallbackStepChip[];
  configured: boolean;
} => {
  const doc = parseDocument(fragment);
  const raw = isMap(doc.contents) ? doc.getIn(['on-failure'], false) : undefined;
  const js = toJs(raw) as Record<string, unknown> | undefined;
  if (!js || typeof js !== 'object') {
    return {
      retryEnabled: false,
      maxAttempts: DEFAULT_MAX_ATTEMPTS,
      delay: DEFAULT_DELAY,
      continueOnFailure: false,
      fallbacks: [],
      configured: false,
    };
  }
  const retry = js.retry as Record<string, unknown> | undefined;
  const fallbackRaw = js.fallback;
  const fallbacks: FallbackStepChip[] = [];
  if (Array.isArray(fallbackRaw)) {
    for (const step of fallbackRaw) {
      if (step && typeof step === 'object' && typeof (step as { name?: unknown }).name === 'string') {
        fallbacks.push({ name: (step as { name: string }).name });
      }
    }
  }
  return {
    retryEnabled: retry != null && typeof retry === 'object',
    maxAttempts:
      typeof retry?.['max-attempts'] === 'number' && retry['max-attempts'] > 0
        ? retry['max-attempts']
        : DEFAULT_MAX_ATTEMPTS,
    delay: typeof retry?.delay === 'string' && retry.delay.length > 0 ? retry.delay : DEFAULT_DELAY,
    continueOnFailure: js.continue === true,
    fallbacks,
    configured: true,
  };
};

/** True when any on-failure setting is present on the fragment. */
export const hasOnFailureConfigured = (fragment: string): boolean =>
  readOnFailure(fragment).configured;

const mutateOnFailure = (
  fragment: string,
  indent: number,
  mutate: (onFailure: YAMLMap, doc: ReturnType<typeof parseDocument>) => void
): string => {
  const doc = parseDocument(fragment);
  if (!isMap(doc.contents)) return fragment;
  let onFailure = doc.getIn(['on-failure']);
  if (!isMap(onFailure)) {
    onFailure = doc.createNode({}) as YAMLMap;
    doc.setIn(['on-failure'], onFailure);
  }
  mutate(onFailure, doc);
  if (onFailure.items.length === 0) {
    doc.deleteIn(['on-failure']);
  }
  return doc.toString({ indent, lineWidth: 0 });
};

/**
 * Form controls for step `on-failure` retry / continue. Fallback creation and
 * removal live on the canvas only — this section is discovery + properties.
 */
export function StepErrorHandlingSection({
  fragment,
  indent,
  onFragmentChange,
  onRevealErrorPort,
  onViewFallbackOnCanvas,
}: StepErrorHandlingSectionProps) {
  const { euiTheme } = useEuiTheme();
  const retrySwitchId = useGeneratedHtmlId({ prefix: 'workflowStepErrorRetry' });
  const continueSwitchId = useGeneratedHtmlId({ prefix: 'workflowStepErrorContinue' });
  const state = useMemo(() => readOnFailure(fragment), [fragment]);

  const setRetryEnabled = useCallback(
    (enabled: boolean) => {
      onFragmentChange(
        mutateOnFailure(fragment, indent, (onFailure, doc) => {
          if (!isMap(onFailure)) return;
          if (!enabled) {
            onFailure.delete('retry');
            return;
          }
          onFailure.set(
            'retry',
            doc.createNode({
              'max-attempts': DEFAULT_MAX_ATTEMPTS,
              delay: DEFAULT_DELAY,
            })
          );
        })
      );
    },
    [fragment, indent, onFragmentChange]
  );

  const setMaxAttempts = useCallback(
    (value: number) => {
      onFragmentChange(
        mutateOnFailure(fragment, indent, (onFailure) => {
          if (!isMap(onFailure)) return;
          const retry = onFailure.get('retry');
          if (!isMap(retry)) return;
          retry.set('max-attempts', value);
        })
      );
    },
    [fragment, indent, onFragmentChange]
  );

  const setDelay = useCallback(
    (value: string) => {
      onFragmentChange(
        mutateOnFailure(fragment, indent, (onFailure) => {
          if (!isMap(onFailure)) return;
          const retry = onFailure.get('retry');
          if (!isMap(retry)) return;
          if (value.trim().length === 0) retry.set('delay', DEFAULT_DELAY);
          else retry.set('delay', value);
        })
      );
    },
    [fragment, indent, onFragmentChange]
  );

  const setContinue = useCallback(
    (enabled: boolean) => {
      onFragmentChange(
        mutateOnFailure(fragment, indent, (onFailure) => {
          if (!isMap(onFailure)) return;
          if (!enabled) onFailure.delete('continue');
          else onFailure.set('continue', true);
        })
      );
    },
    [fragment, indent, onFragmentChange]
  );

  const compactSwitchCss = {
    display: 'flex',
    flexDirection: 'column' as const,
    rowGap: euiTheme.size.xs,
  };

  // TODO(review): retry state may surface as a small badge on the canvas node
  // (decoupled from failure-branch visuals) — pending Marco visual-builder review.

  return (
    <div
      data-test-subj="workflowStepConfigErrorHandling"
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: euiTheme.size.l,
      }}
    >
      <div css={compactSwitchCss} data-test-subj="workflowStepConfigErrorRetryRow">
        <div
          css={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: euiTheme.size.s,
          }}
        >
          <label htmlFor={retrySwitchId} css={{ fontWeight: euiTheme.font.weight.medium, cursor: 'pointer' }}>
            {i18n.translate('workflows.stepConfigPanel.errorHandling.retryLabel', {
              defaultMessage: 'Retry on failure',
            })}
          </label>
          <EuiSwitch
            id={retrySwitchId}
            label=""
            compressed
            checked={state.retryEnabled}
            onChange={(e) => setRetryEnabled(e.target.checked)}
            data-test-subj="workflowStepConfigErrorRetry"
          />
        </div>
        <EuiText size="xs" color="subdued">
          {i18n.translate('workflows.stepConfigPanel.errorHandling.retryHelp', {
            defaultMessage: 'Re-run this step automatically when it fails',
          })}
        </EuiText>
        {state.retryEnabled ? (
          <div
            css={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: euiTheme.size.m,
              marginTop: euiTheme.size.s,
              alignItems: 'start',
            }}
          >
            <div>
              <EuiFormRow
                label={i18n.translate('workflows.stepConfigPanel.errorHandling.maxAttempts', {
                  defaultMessage: 'Max attempts',
                })}
                display="rowCompressed"
                fullWidth
              >
                <EuiFieldNumber
                  compressed
                  fullWidth
                  min={1}
                  value={state.maxAttempts}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    if (Number.isFinite(next) && next >= 1) setMaxAttempts(Math.floor(next));
                  }}
                  data-test-subj="workflowStepConfigErrorMaxAttempts"
                />
              </EuiFormRow>
            </div>
            <div>
              <EuiFormRow
                label={i18n.translate('workflows.stepConfigPanel.errorHandling.delay', {
                  defaultMessage: 'Delay',
                })}
                display="rowCompressed"
                fullWidth
              >
                <EuiFieldText
                  compressed
                  fullWidth
                  value={state.delay}
                  onChange={(e) => setDelay(e.target.value)}
                  data-test-subj="workflowStepConfigErrorDelay"
                />
              </EuiFormRow>
            </div>
          </div>
        ) : null}
      </div>

      <div css={compactSwitchCss} data-test-subj="workflowStepConfigErrorContinueRow">
        <div
          css={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: euiTheme.size.s,
          }}
        >
          <label
            htmlFor={continueSwitchId}
            css={{ fontWeight: euiTheme.font.weight.medium, cursor: 'pointer' }}
          >
            {i18n.translate('workflows.stepConfigPanel.errorHandling.continueLabel', {
              defaultMessage: 'Continue on failure',
            })}
          </label>
          <EuiSwitch
            id={continueSwitchId}
            label=""
            compressed
            checked={state.continueOnFailure}
            onChange={(e) => setContinue(e.target.checked)}
            data-test-subj="workflowStepConfigErrorContinue"
          />
        </div>
        <EuiText size="xs" color="subdued">
          {i18n.translate('workflows.stepConfigPanel.errorHandling.continueHelp', {
            defaultMessage:
              'The workflow keeps running even if this step (and its retries) fail',
          })}
        </EuiText>
      </div>

      <div
        data-test-subj="workflowStepConfigErrorFallback"
        css={{
          display: 'flex',
          flexDirection: 'column',
          gap: euiTheme.size.s,
          padding: euiTheme.size.s,
          borderRadius: euiTheme.border.radius.medium,
          background: euiTheme.colors.backgroundBaseSubdued,
        }}
      >
        {state.fallbacks.length > 0 ? (
          <>
            {state.fallbacks.map((step) => (
              <div
                key={step.name}
                data-test-subj={`workflowStepConfigErrorFallbackChip-${step.name}`}
                css={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: euiTheme.size.s,
                  minWidth: 0,
                }}
              >
                <EuiIcon type="branch" color="danger" aria-hidden />
                <span css={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {step.name}
                </span>
                {onViewFallbackOnCanvas ? (
                  <EuiLink
                    onClick={() => onViewFallbackOnCanvas(step.name)}
                    data-test-subj={`workflowStepConfigErrorViewFallback-${step.name}`}
                  >
                    {i18n.translate('workflows.stepConfigPanel.errorHandling.viewOnCanvas', {
                      defaultMessage: 'View on canvas',
                    })}
                  </EuiLink>
                ) : null}
              </div>
            ))}
          </>
        ) : (
          <EuiText size="xs" color="subdued">
            {i18n.translate('workflows.stepConfigPanel.errorHandling.canvasHint', {
              defaultMessage:
                "To run specific steps when this fails, add an error path from the node's failure point on the canvas",
            })}{' '}
            {onRevealErrorPort ? (
              <EuiLink
                onClick={onRevealErrorPort}
                data-test-subj="workflowStepConfigErrorShowMe"
              >
                {i18n.translate('workflows.stepConfigPanel.errorHandling.showMe', {
                  defaultMessage: 'Show me',
                })}
              </EuiLink>
            ) : null}
          </EuiText>
        )}
      </div>
    </div>
  );
}

/** Badge shown on the Error handling accordion when any on-failure key exists. */
export function ErrorHandlingConfiguredBadge() {
  return (
    <EuiBadge color="hollow" data-test-subj="workflowStepConfigErrorConfiguredBadge">
      {i18n.translate('workflows.stepConfigPanel.errorHandling.configuredBadge', {
        defaultMessage: 'Configured',
      })}
    </EuiBadge>
  );
}
