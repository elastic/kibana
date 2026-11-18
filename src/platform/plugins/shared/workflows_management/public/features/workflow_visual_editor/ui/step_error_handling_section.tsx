/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiFieldNumber,
  EuiFieldText,
  EuiFormRow,
  EuiSwitch,
  EuiText,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { isMap, parseDocument, type YAMLMap } from 'yaml';
import { i18n } from '@kbn/i18n';
import { isRecord } from '@kbn/workflows-yaml';

export interface FallbackStepChip {
  readonly name: string;
}

export interface StepErrorHandlingSectionProps {
  /** The step's text, which every change is written back into. */
  readonly fragment: string;
  /** The step's `on-failure` as plain data (already parsed from `fragment`), for what is shown. */
  readonly onFailureValue: unknown;
  readonly indent: number;
  readonly onFragmentChange: (next: string) => void;
  /** The step is a loop: the engine runs retry / continue around the whole loop, not per iteration. */
  readonly isLoop?: boolean;
}

const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_DELAY = '5s';

const readOnFailure = (
  onFailure: unknown
): {
  retryEnabled: boolean;
  maxAttempts: number;
  delay: string;
  continueOnFailure: boolean;
  fallbacks: FallbackStepChip[];
  configured: boolean;
} => {
  const js = isRecord(onFailure) ? onFailure : undefined;
  if (!js) {
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
      if (
        step &&
        typeof step === 'object' &&
        typeof (step as { name?: unknown }).name === 'string'
      ) {
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

const mutateOnFailure = (
  fragment: string,
  indent: number,
  mutate: (onFailure: YAMLMap, doc: ReturnType<typeof parseDocument>) => void
): string => {
  const doc = parseDocument(fragment);
  if (!isMap(doc.contents)) return fragment;
  let onFailureNode: YAMLMap;
  const existingOnFailure = doc.getIn(['on-failure']);
  if (isMap(existingOnFailure)) {
    onFailureNode = existingOnFailure;
  } else {
    onFailureNode = doc.createNode({}) as YAMLMap;
    doc.setIn(['on-failure'], onFailureNode);
  }
  mutate(onFailureNode, doc);
  if (onFailureNode.items.length === 0) {
    doc.deleteIn(['on-failure']);
  }
  return doc.toString({ indent, lineWidth: 0 });
};

/**
 * What the user is typing into a field whose stored value is always valid: the text may be empty or
 * half-written for a while. The stored value comes back when the field is left, or changes elsewhere.
 */
const useTypedText = (stored: string) => {
  const [typed, setTyped] = useState(stored);
  useEffect(() => setTyped(stored), [stored]);
  return { typed, setTyped, restore: () => setTyped(stored) };
};

/**
 * Form controls for step `on-failure` retry / continue. Fallback creation and
 * removal live on the canvas only.
 */
export function StepErrorHandlingSection({
  fragment,
  onFailureValue,
  indent,
  onFragmentChange,
  isLoop = false,
}: StepErrorHandlingSectionProps) {
  const { euiTheme } = useEuiTheme();
  const retrySwitchId = useGeneratedHtmlId({ prefix: 'workflowStepErrorRetry' });
  const continueSwitchId = useGeneratedHtmlId({ prefix: 'workflowStepErrorContinue' });
  const state = useMemo(() => readOnFailure(onFailureValue), [onFailureValue]);
  const maxAttemptsText = useTypedText(String(state.maxAttempts));
  const delayText = useTypedText(state.delay);

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
          retry.set('delay', value);
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
          <label
            htmlFor={retrySwitchId}
            css={{ fontWeight: euiTheme.font.weight.medium, cursor: 'pointer' }}
          >
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
          {isLoop
            ? i18n.translate('workflows.stepConfigPanel.errorHandling.loopRetryHelp', {
                defaultMessage: 'Re-run the whole loop automatically when it fails',
              })
            : i18n.translate('workflows.stepConfigPanel.errorHandling.retryHelp', {
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
                  value={maxAttemptsText.typed}
                  onChange={(e) => {
                    maxAttemptsText.setTyped(e.target.value);
                    const next = Number(e.target.value);
                    if (e.target.value !== '' && Number.isFinite(next) && next >= 1) {
                      setMaxAttempts(Math.floor(next));
                    }
                  }}
                  onBlur={maxAttemptsText.restore}
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
                  value={delayText.typed}
                  onChange={(e) => {
                    delayText.setTyped(e.target.value);
                    if (e.target.value.trim() !== '') setDelay(e.target.value);
                  }}
                  onBlur={delayText.restore}
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
          {isLoop
            ? i18n.translate('workflows.stepConfigPanel.errorHandling.loopContinueHelp', {
                defaultMessage:
                  'The workflow keeps running after the loop even if it (and its retries) fail. A failing iteration stops the loop.',
              })
            : i18n.translate('workflows.stepConfigPanel.errorHandling.continueHelp', {
                defaultMessage:
                  'The workflow keeps running even if this step (and its retries) fail',
              })}
        </EuiText>
      </div>
    </div>
  );
}
