/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { EuiFormRow, EuiRange } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { debounce } from 'lodash';

export const DEFAULT_MAX_ALLOWED_SAMPLE_SIZE = 1000;
export const MIN_ALLOWED_SAMPLE_SIZE = 1;
export const RANGE_MIN_SAMPLE_SIZE = 10; // it's necessary to be able to use `step={10}` configuration for EuiRange
export const RANGE_STEP_SAMPLE_SIZE = 10;

export interface UnifiedDataTableAdditionalDisplaySettingsProps {
  maxAllowedSampleSize?: number;
  sampleSize: number;
  onChangeSampleSize: (sampleSize: number) => void;
}

export const UnifiedDataTableAdditionalDisplaySettings: React.FC<
  UnifiedDataTableAdditionalDisplaySettingsProps
> = ({
  maxAllowedSampleSize = DEFAULT_MAX_ALLOWED_SAMPLE_SIZE,
  sampleSize,
  onChangeSampleSize,
}) => {
  const [activeSampleSize, setActiveSampleSize] = useState<number | ''>(sampleSize);
  const minRangeSampleSize = Math.max(
    Math.min(RANGE_MIN_SAMPLE_SIZE, sampleSize),
    MIN_ALLOWED_SAMPLE_SIZE
  ); // flexible: allows to go lower than RANGE_MIN_SAMPLE_SIZE but greater than MIN_ALLOWED_SAMPLE_SIZE

  const debouncedOnChangeSampleSize = useMemo(
    () => debounce(onChangeSampleSize, 300, { leading: false, trailing: true }),
    [onChangeSampleSize]
  );

  const onChangeActiveSampleSize = useCallback(
    (event) => {
      if (!event.target.value) {
        setActiveSampleSize('');
        return;
      }

      const newSampleSize = Number(event.target.value);

      if (newSampleSize >= MIN_ALLOWED_SAMPLE_SIZE) {
        setActiveSampleSize(newSampleSize);
        if (newSampleSize <= maxAllowedSampleSize) {
          debouncedOnChangeSampleSize(newSampleSize);
        }
      }
    },
    [maxAllowedSampleSize, setActiveSampleSize, debouncedOnChangeSampleSize]
  );

  const sampleSizeLabel = i18n.translate('unifiedDataTable.sampleSizeSettings.sampleSizeLabel', {
    defaultMessage: 'Sample size',
  });

  useEffect(() => {
    setActiveSampleSize(sampleSize); // reset local state
  }, [sampleSize, setActiveSampleSize]);

  return (
    <EuiFormRow label={sampleSizeLabel} display="columnCompressed">
      <EuiRange
        compressed
        fullWidth
        min={minRangeSampleSize}
        max={maxAllowedSampleSize}
        step={minRangeSampleSize === RANGE_MIN_SAMPLE_SIZE ? RANGE_STEP_SAMPLE_SIZE : 1}
        showInput
        value={activeSampleSize}
        onChange={onChangeActiveSampleSize}
        data-test-subj="unifiedDataTableSampleSizeInput"
      />
    </EuiFormRow>
  );
};
