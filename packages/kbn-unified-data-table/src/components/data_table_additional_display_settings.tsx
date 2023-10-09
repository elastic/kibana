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

export const MAX_ALLOWED_SAMPLE_SIZE = 1000;
export const MIN_ALLOWED_SAMPLE_SIZE = 10;
export const SAMPLE_SIZE_STEP = 10;

export interface UnifiedDataTableAdditionalDisplaySettingsProps {
  sampleSize: number;
  onChangeSampleSize: (sampleSize: number) => void;
}

export const UnifiedDataTableAdditionalDisplaySettings: React.FC<
  UnifiedDataTableAdditionalDisplaySettingsProps
> = ({ sampleSize, onChangeSampleSize }) => {
  const [activeSampleSize, setActiveSampleSize] = useState<number | ''>(sampleSize);

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

      if (newSampleSize > 0) {
        setActiveSampleSize(newSampleSize);
        if (newSampleSize <= MAX_ALLOWED_SAMPLE_SIZE) {
          debouncedOnChangeSampleSize(newSampleSize);
        }
      }
    },
    [setActiveSampleSize, debouncedOnChangeSampleSize]
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
        min={MIN_ALLOWED_SAMPLE_SIZE}
        max={MAX_ALLOWED_SAMPLE_SIZE}
        step={SAMPLE_SIZE_STEP}
        showInput
        value={activeSampleSize}
        onChange={onChangeActiveSampleSize}
        data-test-subj="unifiedDataTableSampleSizeInput"
      />
    </EuiFormRow>
  );
};
