/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { ValueMember, Value } from './validated_dual_range';

const LOWER_VALUE_INDEX = 0;
const UPPER_VALUE_INDEX = 1;

export function isRangeValid(
  value: Value = [0, 0],
  min: ValueMember = 0,
  max: ValueMember = 0,
  allowEmptyRange?: boolean
) {
  allowEmptyRange = typeof allowEmptyRange === 'boolean' ? allowEmptyRange : true; // cannot use default props since that uses falsy check
  let lowerValue: ValueMember = isNaN(value[LOWER_VALUE_INDEX] as number)
    ? ''
    : `${value[LOWER_VALUE_INDEX]}`;
  let upperValue: ValueMember = isNaN(value[UPPER_VALUE_INDEX] as number)
    ? ''
    : `${value[UPPER_VALUE_INDEX]}`;

  const isLowerValueValid = lowerValue.toString() !== '';
  const isUpperValueValid = upperValue.toString() !== '';
  if (isLowerValueValid) {
    lowerValue = parseFloat(lowerValue);
  }
  if (isUpperValueValid) {
    upperValue = parseFloat(upperValue);
  }
  let isValid = true;
  let errorMessage = '';

  const bothMustBeSetErrorMessage = i18n.translate(
    'kibana-react.dualRangeControl.mustSetBothErrorMessage',
    {
      defaultMessage: 'Both lower and upper values must be set',
    }
  );
  if (!allowEmptyRange && (!isLowerValueValid || !isUpperValueValid)) {
    isValid = false;
    errorMessage = bothMustBeSetErrorMessage;
  } else if (
    (!isLowerValueValid && isUpperValueValid) ||
    (isLowerValueValid && !isUpperValueValid)
  ) {
    isValid = false;
    errorMessage = bothMustBeSetErrorMessage;
  } else if ((isLowerValueValid && lowerValue < min) || (isUpperValueValid && upperValue > max)) {
    isValid = false;
    errorMessage = i18n.translate('kibana-react.dualRangeControl.outsideOfRangeErrorMessage', {
      defaultMessage: 'Values must be on or between {min} and {max}',
      values: { min, max },
    });
  } else if (isLowerValueValid && isUpperValueValid && upperValue < lowerValue) {
    isValid = false;
    errorMessage = i18n.translate('kibana-react.dualRangeControl.upperValidErrorMessage', {
      defaultMessage: 'Upper value must be greater or equal to lower value',
    });
  }

  return {
    isValid,
    errorMessage,
  };
}
