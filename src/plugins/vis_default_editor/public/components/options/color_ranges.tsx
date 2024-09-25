/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback } from 'react';
import { last } from 'lodash';

import { i18n } from '@kbn/i18n';

import { RangeValues, RangesParamEditor } from '../controls/ranges';

export type SetColorRangeValue = (paramName: string, value: RangeValues[]) => void;

interface ColorRangesProps {
  'data-test-subj'?: string;
  colorsRange: RangeValues[];
  setValue: SetColorRangeValue;
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
    ({ from, to }: RangeValues, index: number) => {
      if (from === undefined || to === undefined || !colorsRange[index]) {
        return [false, false];
      }

      const leftBound = index === 0 ? -Infinity : colorsRange[index - 1].to || 0;
      const isFromValid = from >= leftBound;
      const isToValid = to >= from;

      return [isFromValid, isToValid];
    },
    [colorsRange]
  );

  const setColorRanges = useCallback(
    (value: RangeValues[]) => setValue('colorsRange', value),
    [setValue]
  );

  return (
    <RangesParamEditor
      data-test-subj={dataTestSubj}
      error={i18n.translate('visDefaultEditor.options.colorRanges.errorText', {
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
