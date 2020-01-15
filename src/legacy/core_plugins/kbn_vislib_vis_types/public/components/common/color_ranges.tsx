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

import React, { useCallback } from 'react';
import { last } from 'lodash';
import { i18n } from '@kbn/i18n';

import { RangeValues, RangesParamEditor } from 'ui/vis/editors/default/controls/ranges';

interface ColorRangesProps {
  'data-test-subj'?: string;
  colorsRange: RangeValues[];
  setValue(paramName: string, value: RangeValues[]): void;
  setValidity?(isValid: boolean): void;
  setTouched?(isTouched: boolean): void;
}

function ColorRanges({
  'data-test-subj': dataTestSubj,
  colorsRange,
  setValue,
  setValidity,
  setTouched,
}: ColorRangesProps) {
  const addRangeValues = useCallback(() => {
    const previousRange = last(colorsRange) || {};
    const from = previousRange.to ? previousRange.to : 0;
    const to = previousRange.to ? from + (previousRange.to - (previousRange.from || 0)) : 100;

    return { from, to };
  }, [colorsRange]);

  const validateRange = useCallback(
    ({ from, to }, index) => {
      if (!colorsRange[index]) {
        return [false, false];
      }

      const leftBound = index === 0 ? -Infinity : colorsRange[index - 1].to || 0;
      const isFromValid = from >= leftBound;
      const isToValid = to >= from;

      return [isFromValid, isToValid];
    },
    [colorsRange]
  );

  const setColorRanges = useCallback((value: RangeValues[]) => setValue('colorsRange', value), [
    setValue,
  ]);

  return (
    <RangesParamEditor
      data-test-subj={dataTestSubj}
      error={i18n.translate('kbnVislibVisTypes.controls.colorRanges.errorText', {
        defaultMessage: 'Each range should be greater than previous.',
      })}
      hidePlaceholders={true}
      value={colorsRange}
      setValue={setColorRanges}
      setValidity={setValidity}
      setTouched={setTouched}
      addRangeValues={addRangeValues}
      validateRange={validateRange}
    />
  );
}

export { ColorRanges };
