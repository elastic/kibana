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
  const [currentStepIndex, setCurrentStepIndex] = useState(1);
  // const idleTaskId = useRef<ReturnType<typeof requestIdleCallback> | null>(null);
  const currentProductIntercept = useMemo(() => {
    // always use the last product intercept
    return productIntercepts[productIntercepts.length - 1];
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
    setCurrentStepIndex((prevStepIndex) =>
      Math.min(prevStepIndex + 1, currentProductIntercept.steps?.length)
    );
  }, [currentProductIntercept]);

  const dismissProductIntercept = useCallback(() => {
    currentProductIntercept?.onDismiss?.();
    ackProductIntercept(currentProductIntercept.id, 'dismissed');
  }, [ackProductIntercept, currentProductIntercept]);

  return productIntercepts.length ? (
    <EuiTourStep
      buffer={24}
      title={currentProductIntercept.steps?.[currentStepIndex - 1].title}
      content={currentProductIntercept.steps?.[currentStepIndex - 1].content}
      stepsTotal={currentProductIntercept.steps.length}
      step={currentStepIndex}
      minWidth={400}
      hasArrow={false}
      attachToAnchor={false}
      anchorPosition="rightCenter"
      decoration="none"
      onFinish={() => {
        currentProductIntercept?.onFinish?.();
        ackProductIntercept(currentProductIntercept.id, 'completed');
      }}
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
