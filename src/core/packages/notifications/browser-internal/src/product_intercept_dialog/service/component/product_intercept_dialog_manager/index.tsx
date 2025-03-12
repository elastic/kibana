/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiTourStep, EuiButton, EuiButtonEmpty } from '@elastic/eui';
import type { ProductIntercept } from '@kbn/core-notifications-browser';

import { ProductInterceptDialogApi } from '../../product_intercept_dialog_api';

interface ProductInterceptDialogManagerProps {
  ackProductIntercept: ProductInterceptDialogApi['ack'];
  productIntercepts$: ReturnType<ProductInterceptDialogApi['get$']>;
}

export function ProductInterceptDialogManager({
  ackProductIntercept,
  productIntercepts$,
}: ProductInterceptDialogManagerProps) {
  const [productIntercepts, setProductIntercepts] = useState<ProductIntercept[]>([]);
  // we start at 1, because eui tour steps are 1-indexed
  const [currentStepIndex, setCurrentStepIndex] = useState(1);
  const currentProductIntercept = useMemo<ProductIntercept | null>(() => {
    return productIntercepts[productIntercepts.length - 1] || null;
  }, [productIntercepts]);

  useEffect(() => {
    const subscription = productIntercepts$.subscribe((intercepts) => {
      setProductIntercepts(intercepts);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [productIntercepts$]);

  const nextStep = useCallback(() => {
    setCurrentStepIndex((prevStepIndex) => {
      if (prevStepIndex === currentProductIntercept!.steps.length) {
        currentProductIntercept?.onFinish?.();
        setCurrentStepIndex(1);
        // this will cause the component to unmount
        ackProductIntercept(currentProductIntercept!.id, 'completed');
      }

      return Math.min(prevStepIndex + 1, currentProductIntercept!.steps.length);
    });
  }, [ackProductIntercept, currentProductIntercept]);

  const dismissProductIntercept = useCallback(() => {
    currentProductIntercept?.onDismiss?.();
    setCurrentStepIndex(1);
    ackProductIntercept(currentProductIntercept!.id, 'dismissed');
  }, [ackProductIntercept, currentProductIntercept]);

  const currentProductInterceptStep = useMemo(() => {
    return currentProductIntercept?.steps?.[currentStepIndex - 1];
  }, [currentProductIntercept, currentStepIndex]);

  return currentProductIntercept && currentProductInterceptStep ? (
    <EuiTourStep
      buffer={24}
      stepsTotal={currentProductIntercept.steps.length}
      title={currentProductInterceptStep.title}
      content={currentProductInterceptStep.content}
      step={currentStepIndex}
      minWidth={400}
      hasArrow={false}
      attachToAnchor={false}
      anchorPosition="rightCenter"
      decoration="none"
      panelStyle={{ left: 'unset', transform: 'translateX(98vh) translateY(-15%)' }}
      onFinish={() => {}}
      footerAction={[
        <EuiButtonEmpty onClick={dismissProductIntercept}>
          {i18n.translate('core.notifications.productIntercept.dismiss', {
            defaultMessage: 'Not now, thanks',
          })}
        </EuiButtonEmpty>,
        <EuiButton onClick={nextStep}>
          {i18n.translate('core.notifications.productIntercept.nextStep', {
            defaultMessage: 'Next',
          })}
        </EuiButton>,
      ]}
      isOpen
      repositionOnScroll
      repositionToCrossAxis
    >
      <div style={{ display: 'contents', width: '100%' }} />
    </EuiTourStep>
  ) : null;
}
