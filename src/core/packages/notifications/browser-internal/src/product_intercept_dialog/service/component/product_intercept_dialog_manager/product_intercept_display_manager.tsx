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
import type { ProductIntercept } from '@kbn/core-notifications-browser';

import { ProductInterceptDialogApi } from '../../product_intercept_dialog_api';

interface ProductInterceptDialogManagerProps {
  ackProductIntercept: ProductInterceptDialogApi['ack'];
  productIntercepts$: ReturnType<ProductInterceptDialogApi['get$']>;
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

export function ProductInterceptDisplayManager({
  ackProductIntercept,
  productIntercepts$,
}: ProductInterceptDialogManagerProps) {
  const { euiTheme } = useEuiTheme();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [currentProductIntercept, setCurrentProductIntercept] = useState<ProductIntercept | null>(
    null
  );

  const processingProductIntercept = useRef(new Rx.BehaviorSubject(false));

  useEffect(() => {
    const subscription = productIntercepts$
      .pipe(
        Rx.mergeMap((x) => x),
        Rx.distinct(({ id }) => id)
      )
      .pipe(Rx.delayWhen(() => processingProductIntercept.current.pipe(Rx.filter((v) => !v))))
      .subscribe((intercepts) => {
        processingProductIntercept.current.next(true);
        setCurrentProductIntercept(intercepts);
      });

    return () => subscription.unsubscribe();
  }, [productIntercepts$]);

  const currentProductInterceptStep = useMemo(() => {
    return currentProductIntercept?.steps?.[currentStepIndex];
  }, [currentProductIntercept, currentStepIndex]);

  const nextStep = useCallback(() => {
    setCurrentStepIndex((prevStepIndex) => {
      if (prevStepIndex === currentProductIntercept!.steps.length) {
        currentProductIntercept?.onFinish?.();
        setCurrentStepIndex(0);
        // this will cause the component to unmount
        ackProductIntercept(currentProductIntercept!.id, 'completed');
      }

      return Math.min(prevStepIndex + 1, currentProductIntercept!.steps.length);
    });
  }, [ackProductIntercept, currentProductIntercept]);

  const dismissProductIntercept = useCallback(() => {
    currentProductIntercept?.onDismiss?.();
    ackProductIntercept(currentProductIntercept!.id, 'dismissed');
    setCurrentStepIndex(0);
    setCurrentProductIntercept(null);

    requestIdleCallback(() => {
      // signal readiness for new intercept when machine is idle
      processingProductIntercept.current.next(false);
    });
  }, [ackProductIntercept, currentProductIntercept]);

  return currentProductIntercept && currentProductInterceptStep ? (
    <EuiPortal>
      <EuiSplitPanel.Outer
        grow
        role="dialog"
        css={css`
          position: fixed;
          inline-size: 360px;
          max-block-size: auto;
          inset-inline-end: ${euiTheme.size.l};
          inset-block-end: ${euiTheme.size.l};

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
                    <h2>{currentProductInterceptStep!.title}</h2>
                  </EuiTitle>
                </EuiFlexItem>
                {currentStepIndex > 0 && (
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
              <EuiForm fullWidth>{currentProductInterceptStep!.content}</EuiForm>
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
          <EuiFlexGroup>
            <EuiFlexItem
              css={css`
                justify-content: center;
              `}
            >
              <InterceptProgressIndicator
                stepsTotal={currentProductIntercept.steps.length}
                currentStep={currentStepIndex}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFlexGroup gutterSize="xs">
                {currentStepIndex === 0 && (
                  <EuiFlexItem>
                    <EuiButtonEmpty onClick={dismissProductIntercept} color="text">
                      {i18n.translate('core.notifications.productIntercept.dismiss', {
                        defaultMessage: 'Not now, thanks',
                      })}
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                )}
                <EuiFlexItem>
                  <EuiButton onClick={nextStep}>
                    {i18n.translate('core.notifications.productIntercept.nextStep', {
                      defaultMessage: 'Next',
                    })}
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiSplitPanel.Inner>
      </EuiSplitPanel.Outer>
    </EuiPortal>
  ) : null;
}
