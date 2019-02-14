/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

const LOWER_VALUE_INDEX = 0;
const UPPER_VALUE_INDEX = 1;

export function isRangeValid(value, min, max, formatMessage) {
  const lowerValue = isNaN(value[LOWER_VALUE_INDEX]) ? '' : value[LOWER_VALUE_INDEX];
  const upperValue = isNaN(value[UPPER_VALUE_INDEX]) ? '' : value[UPPER_VALUE_INDEX];

  const isLowerValueValid = lowerValue !== '';
  const isUpperValueValid = upperValue !== '';
  let isValid = true;
  let errorMessage = '';

  if ((!isLowerValueValid && isUpperValueValid) || (isLowerValueValid && !isUpperValueValid)) {
    isValid = false;
    errorMessage = formatMessage({
      id: 'common.ui.dualRangeControl.mustSetBothErrorMessage',
      defaultMessage: 'both lower and upper value must be set'
    });
  }

  if (lowerValue < min || upperValue > max) {
    isValid = false;
    errorMessage = formatMessage({
      id: 'common.ui.dualRangeControl.outsideOfRangeErrorMessage',
      values: { min, max },
      defaultMessage: `must be between ${min} and ${max}`
    });
  }

  if (isLowerValueValid && isUpperValueValid && upperValue < lowerValue) {
    isValid = false;
    errorMessage = formatMessage({
      id: 'common.ui.dualRangeControl.upperValidErrorMessage',
      defaultMessage: 'upper must be greater or equal to lower'
    });
  }

  return {
    isValid,
    errorMessage,
  };
}
