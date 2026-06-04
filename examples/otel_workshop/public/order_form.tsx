/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useState } from 'react';
import {
  EuiText,
  EuiButton,
  EuiLoadingSpinner,
  EuiSelect,
  EuiFormRow,
  EuiCallOut,
  EuiSpacer,
  EuiCodeBlock,
} from '@elastic/eui';
import { isHttpFetchError } from '@kbn/core-http-browser';
import {
  DRINK_TYPES,
  DRINK_SIZES,
  type DrinkType,
  type DrinkSize,
  type OrderResult,
} from '../common';
import type { Services } from './services';

interface Props {
  submitOrder: Services['submitOrder'];
}

const drinkOptions = DRINK_TYPES.map((drink) => ({ value: drink, text: drink }));
const sizeOptions = DRINK_SIZES.map((size) => ({ value: size, text: size }));

export function OrderForm({ submitOrder }: Props) {
  const [drink, setDrink] = useState<DrinkType>(DRINK_TYPES[0]);
  const [size, setSize] = useState<DrinkSize>(DRINK_SIZES[1]);
  const [result, setResult] = useState<OrderResult | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [isBrewing, setIsBrewing] = useState(false);

  const doSubmit = useCallback(async () => {
    if (isBrewing) return;
    setIsBrewing(true);
    setError(undefined);

    const response = await submitOrder({ drink, size });
    if (isHttpFetchError(response)) {
      const body = response.body as { message?: string } | undefined;
      setResult(undefined);
      setError(body?.message ?? response.message);
    } else {
      setError(undefined);
      setResult(response);
    }

    setIsBrewing(false);
  }, [isBrewing, submitOrder, drink, size]);

  return (
    <EuiText>
      <h2>Place an order</h2>
      <p>
        Submits a single order to <code>POST /api/otel_workshop/order</code>, which runs the
        un-instrumented <code>processOrder</code> pipeline. Orders occasionally fail — that is on
        purpose.
      </p>

      <EuiFormRow label="Drink">
        <EuiSelect
          data-test-subj="otelWorkshopDrinkSelect"
          options={drinkOptions}
          value={drink}
          onChange={(e) => setDrink(e.target.value as DrinkType)}
        />
      </EuiFormRow>
      <EuiFormRow label="Size">
        <EuiSelect
          data-test-subj="otelWorkshopSizeSelect"
          options={sizeOptions}
          value={size}
          onChange={(e) => setSize(e.target.value as DrinkSize)}
        />
      </EuiFormRow>
      <EuiFormRow hasEmptyLabelSpace>
        <EuiButton
          data-test-subj="otelWorkshopPlaceOrder"
          disabled={isBrewing}
          onClick={() => doSubmit()}
          fill
        >
          {isBrewing ? <EuiLoadingSpinner /> : 'Place order ☕'}
        </EuiButton>
      </EuiFormRow>

      {result ? (
        <>
          <EuiSpacer size="s" />
          <EuiCodeBlock language="json" paddingSize="m" data-test-subj="otelWorkshopOrderResult">
            {JSON.stringify(result, null, 2)}
          </EuiCodeBlock>
        </>
      ) : null}
      {error ? (
        <>
          <EuiSpacer size="s" />
          <EuiCallOut announceOnMount color="danger" iconType="warning" title="Order failed">
            {error}
          </EuiCallOut>
        </>
      ) : null}
    </EuiText>
  );
}
