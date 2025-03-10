/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useState, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { Observable } from 'rxjs';
import { EuiTourStep, EuiButton, EuiButtonEmpty } from '@elastic/eui';
import type { ProductIntercept } from '@kbn/core-notifications-browser';
import { EventReporter } from '../../telemetry';

interface ProductInterceptDialogManagerProps {
  eventReporter: EventReporter;
  productIntercepts$: Observable<ProductIntercept[]>;
}

export function ProductInterceptDialogManager({
  productIntercepts$,
}: ProductInterceptDialogManagerProps) {
  const [productIntercepts, setProductIntercepts] = useState<ProductIntercept[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(1);

  useEffect(() => {
    const subscription = productIntercepts$.subscribe((intercepts) => {
      setProductIntercepts(intercepts);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [productIntercepts$]);

  const nextStep = useCallback(() => {
    setCurrentStepIndex((prevStepIndex) => prevStepIndex + 1);
  }, []);

  const dismissProductIntercept = useCallback(() => {}, []);

  return productIntercepts.length ? (
    <EuiTourStep
      buffer={24}
      isOpen={true}
      // panelClassName={css`
      //   background: red;
      //   left: unset;
      //   right: 1%;
      //   `}
      title={productIntercepts[0].steps?.[currentStepIndex - 1].title}
      content={productIntercepts[0].steps?.[currentStepIndex - 1].content}
      stepsTotal={productIntercepts[0].steps.length}
      step={currentStepIndex}
      minWidth={400}
      hasArrow={false}
      attachToAnchor={false}
      repositionOnScroll={true}
      anchorPosition="rightDown"
      decoration="none"
      onFinish={() => {
        // TODO: send collated data to telemetry service using the eventReporter
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
    >
      <div data-test-subj="interceptDialogAnchor" style={{ display: 'contents', width: '100%' }} />
    </EuiTourStep>
  ) : null;
}
