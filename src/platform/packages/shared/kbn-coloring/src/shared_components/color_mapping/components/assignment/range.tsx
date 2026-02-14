/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiFieldNumber, EuiFlexItem, EuiFormPrepend } from '@elastic/eui';
import type { ColorMapping } from '../../config';

export const Range: React.FC<{
  rule: ColorMapping.RuleRange;
  updateValue: (min: number, max: number, minInclusive: boolean, maxInclusive: boolean) => void;
}> = ({ rule, updateValue }) => {
  const minValid = rule.min <= rule.max;
  const maxValid = rule.max >= rule.min;

  return (
    <>
      <EuiFlexItem>
        <EuiFieldNumber
          compressed
          prepend={
            <EuiFormPrepend
              element="button"
              compressed
              label={rule.minInclusive ? 'GTE' : 'GT'}
              onClick={() => updateValue(rule.min, rule.max, !rule.minInclusive, rule.maxInclusive)}
            />
          }
          placeholder="min"
          value={rule.min}
          isInvalid={!minValid}
          onChange={(e) =>
            updateValue(+e.currentTarget.value, rule.max, rule.minInclusive, rule.maxInclusive)
          }
          aria-label="The min value"
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFieldNumber
          compressed
          isInvalid={!maxValid}
          prepend={
            <EuiFormPrepend
              element="button"
              compressed
              label={rule.maxInclusive ? 'LTE' : 'LT'}
              onClick={() => updateValue(rule.min, rule.max, rule.minInclusive, !rule.maxInclusive)}
            />
          }
          placeholder="max"
          value={rule.max}
          onChange={(e) =>
            updateValue(rule.min, +e.currentTarget.value, rule.minInclusive, rule.maxInclusive)
          }
          aria-label="The max value"
        />
      </EuiFlexItem>
    </>
  );
};
