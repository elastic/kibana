/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as Rx from 'rxjs';
import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiPortal,
  useEuiTheme,
  EuiTitle,
  EuiTourStepIndicator,
  euiFlyoutSlideInRight,
  euiCanAnimate,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSplitPanel,
  EuiForm,
  EuiButtonIcon,
} from '@elastic/eui';
import type { EuiTourStepStatus } from '@elastic/eui/src/components/tour/tour_step_indicator';
import { InterceptDialogApi } from '../../intercept_dialog_api';

type Intercept = Rx.ObservedValueOf<ReturnType<InterceptDialogApi['get$']>>[number];

interface InterceptDialogManagerProps {
  ackIntercept: InterceptDialogApi['ack'];
  /**
   * Observable that emits the intercept to be displayed
   */
  intercept$: Rx.Observable<Intercept>;
}

interface InterceptProgressIndicatorProps {
  stepsTotal: number;
  currentStep: number;
}

const InterceptProgressIndicator = React.memo(
  ({ stepsTotal, currentStep }: InterceptProgressIndicatorProps) => {
    if (!stepsTotal) return null;

    return (
      <EuiFlexItem grow={false}>
        <ul className="euiTourFooter__stepList">
          {[...Array(stepsTotal).keys()].map((_, i) => {
            let status: EuiTourStepStatus = 'complete';
            if (currentStep === i) {
              status = 'active';
            } else if (currentStep <= i) {
              status = 'incomplete';
            }
            return <EuiTourStepIndicator key={i} number={i + 1} status={status} />;
          })}
        </ul>
      </EuiFlexItem>
    );
  }
);

export function InterceptDisplayManager({ ackIntercept, intercept$ }: InterceptDialogManagerProps) {
  const { euiTheme } = useEuiTheme();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [currentIntercept, setCurrentIntercept] = useState<Intercept | null>(null);
  const feedbackStore = useRef<Record<string, unknown>>({});

  useEffect(() => {
    const subscription = intercept$.subscribe((intercept) => {
      setCurrentStepIndex(0);
      setCurrentIntercept(intercept);
    });

    return () => subscription.unsubscribe();
  }, [intercept$]);

  const currentInterceptStep = useMemo(() => {
    return currentIntercept?.steps?.[currentStepIndex];
  }, [currentIntercept, currentStepIndex]);

  const nextStep = useCallback(
    (isLastStep?: boolean) => {
      setCurrentStepIndex((prevStepIndex) => {
        if (isLastStep) {
          currentIntercept?.onFinish?.({ response: feedbackStore.current });
          setCurrentStepIndex(0);
          // this will cause the component to unmount
          ackIntercept(currentIntercept!.id, 'completed');
        }

        return Math.min(prevStepIndex + 1, currentIntercept!.steps.length);
      });
    },
    [ackIntercept, currentIntercept]
  );

  const dismissProductIntercept = useCallback(() => {
    ackIntercept(currentIntercept!.id, 'dismissed');
    currentIntercept?.onDismiss?.();
    setCurrentIntercept(null);
  }, [ackIntercept, currentIntercept]);

  const onInputChange = useCallback(
    (value: unknown) => {
      feedbackStore.current[currentInterceptStep!.id] = value;
      currentIntercept?.onProgress?.(currentInterceptStep!.id, value);
      nextStep();
    },
    [currentIntercept, currentInterceptStep, nextStep]
  );

  let isLastStep = false;

  return currentIntercept && currentInterceptStep ? (
    <EuiPortal>
      <EuiSplitPanel.Outer
        grow
        role="dialog"
        data-test-subj={`interceptStep-${currentInterceptStep.id}`}
        css={css`
          position: fixed;
          inline-size: 360px;
          max-block-size: auto;
          inset-inline-end: ${euiTheme.size.l};
          inset-block-end: ${euiTheme.size.xxl};

          ${euiCanAnimate} {
            animation: ${euiFlyoutSlideInRight} ${euiTheme.animation.normal}
              ${euiTheme.animation.resistance};
          }
        `}
      >
        <EuiSplitPanel.Inner
          css={css`
            min-height: 112px;
          `}
        >
          <EuiFlexGroup direction="column">
            <EuiFlexItem>
              <EuiFlexGroup>
                <EuiFlexItem>
                  <EuiTitle size="xxs">
                    <h2>{currentInterceptStep!.title}</h2>
                  </EuiTitle>
                </EuiFlexItem>
                {currentStepIndex > 0 &&
                  !(isLastStep = currentStepIndex === currentIntercept.steps.length - 1) && (
                    <EuiFlexItem grow={false}>
                      <EuiButtonIcon
                        iconType="cross"
                        aria-label="Close dialog"
                        onClick={dismissProductIntercept}
                        color="text"
                      />
                    </EuiFlexItem>
                  )}
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiForm fullWidth>
                {React.createElement(currentInterceptStep!.content, {
                  onValue: onInputChange,
                })}
              </EuiForm>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiSplitPanel.Inner>
        <EuiSplitPanel.Inner
          grow={false}
          color="subdued"
          css={css`
            border-top: ${euiTheme.border.thin};
          `}
        >
          <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
            <EuiFlexItem grow={false}>
              <InterceptProgressIndicator
                stepsTotal={currentIntercept.steps.length}
                currentStep={currentStepIndex}
              />
            </EuiFlexItem>
            {(currentStepIndex === 0 || isLastStep) && (
              <EuiFlexItem grow={false}>
                <EuiFlexGroup gutterSize="xs">
                  {currentStepIndex === 0 && (
                    <EuiFlexItem>
                      <EuiButtonEmpty
                        data-test-subj="productInterceptDismiss"
                        onClick={dismissProductIntercept}
                        color="text"
                      >
                        {i18n.translate('core.notifications.productIntercept.dismiss', {
                          defaultMessage: 'Not now, thanks',
                        })}
                      </EuiButtonEmpty>
                    </EuiFlexItem>
                  )}
                  <EuiFlexItem>
                    <EuiButton
                      data-test-subj="productInterceptProgressionButton"
                      onClick={() => nextStep(isLastStep)}
                    >
                      {i18n.translate('core.notifications.productIntercept.nextStep', {
                        defaultMessage: 'Next',
                      })}
                    </EuiButton>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiSplitPanel.Inner>
      </EuiSplitPanel.Outer>
    </EuiPortal>
  ) : null;
}
