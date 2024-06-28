/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiButtonEmpty, EuiFieldNumber, EuiFlexItem } from '@elastic/eui';
import { ColorMapping } from '../../config';

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
            <EuiButtonEmpty
              size="xs"
              onClick={() => updateValue(rule.min, rule.max, !rule.minInclusive, rule.maxInclusive)}
            >
              {rule.minInclusive ? 'GTE' : 'GT'}
            </EuiButtonEmpty>
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
            <EuiButtonEmpty
              size="xs"
              onClick={() => updateValue(rule.min, rule.max, rule.minInclusive, !rule.maxInclusive)}
            >
              {rule.maxInclusive ? 'LTE' : 'LT'}
            </EuiButtonEmpty>
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
