/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import ReactDOM from 'react-dom';
import type { AppMountParameters } from '@kbn/core/public';
import {
  EuiPageTemplate,
  EuiPageSection,
  EuiText,
  EuiHorizontalRule,
  EuiCallOut,
} from '@elastic/eui';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import type { Services } from './services';
import { OrderForm } from './order_form';
import { BrewBatch } from './brew_batch';

type Props = Services;

function CoffeeShop({ submitOrder, brewBatch, startServices }: Props) {
  return (
    <KibanaRenderContextProvider {...startServices}>
      <EuiPageTemplate>
        <EuiPageTemplate.Header pageTitle="☕ Coffee Shop — OTel Workshop" />
        <EuiPageTemplate.Section>
          <EuiPageSection>
            <EuiCallOut title="This app is deliberately un-instrumented" iconType="iInCircle">
              <EuiText size="s">
                <p>
                  The order pipeline in <code>server/pipeline/process_order.ts</code> works, but
                  emits no metrics or traces yet. Follow the plugin&apos;s <strong>README</strong>{' '}
                  to add an in-flight <code>UpDownCounter</code> and a duration{' '}
                  <code>Histogram</code> (Tier 1), then wrap the pipeline in{' '}
                  <code>withActiveSpan</code> (Tier 3). Use the buttons below to generate traffic
                  once you have instrumented it.
                </p>
              </EuiText>
            </EuiCallOut>
            <EuiHorizontalRule />
            <OrderForm submitOrder={submitOrder} />
            <EuiHorizontalRule />
            <BrewBatch brewBatch={brewBatch} />
          </EuiPageSection>
        </EuiPageTemplate.Section>
      </EuiPageTemplate>
    </KibanaRenderContextProvider>
  );
}

export const renderApp = (props: Props, element: AppMountParameters['element']) => {
  ReactDOM.render(<CoffeeShop {...props} />, element);

  return () => ReactDOM.unmountComponentAtNode(element);
};
