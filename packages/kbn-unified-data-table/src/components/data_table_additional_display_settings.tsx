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
import type { Storage } from '@kbn/kibana-utils-plugin/public';
import { RowHeightSettings } from './row_height_settings';
import { useRowHeight } from '../hooks/use_row_height';
import { ROWS_HEIGHT_OPTIONS } from '../constants';

export const DEFAULT_MAX_ALLOWED_SAMPLE_SIZE = 1000;
export const MIN_ALLOWED_SAMPLE_SIZE = 1;
export const RANGE_MIN_SAMPLE_SIZE = 10; // it's necessary to be able to use `step={10}` configuration for EuiRange
export const RANGE_STEP_SAMPLE_SIZE = 10;

export interface UnifiedDataTableAdditionalDisplaySettingsProps {
  storage: Storage;
  consumer: string;
  configRowHeight?: number;
  rowHeightState?: number;
  onChangeRowHeight?: (rowHeight: number) => void;
  configHeaderRowHeight?: number;
  headerRowHeightState?: number;
  onChangeHeaderRowHeight?: (headerRowHeight: number) => void;
  maxAllowedSampleSize?: number;
  sampleSize: number;
  onChangeSampleSize?: (sampleSize: number) => void;
}

export const UnifiedDataTableAdditionalDisplaySettings: React.FC<
  UnifiedDataTableAdditionalDisplaySettingsProps
> = ({
  storage,
  consumer,
  configRowHeight = ROWS_HEIGHT_OPTIONS.default,
  rowHeightState,
  onChangeRowHeight,
  configHeaderRowHeight = ROWS_HEIGHT_OPTIONS.default,
  headerRowHeightState,
  onChangeHeaderRowHeight,
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
    () => debounce(onChangeSampleSize ?? (() => {}), 300, { leading: false, trailing: true }),
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

  const {
    rowHeight: headerRowHeight,
    rowHeightLines: headerRowHeightLines,
    onUpdateRowHeight: onUpdateHeaderRowHeight,
    onUpdateRowHeightLines: onUpdateHeaderRowHeightLines,
  } = useRowHeight({
    storage,
    consumer,
    key: 'dataGridHeaderRowHeight',
    configRowHeight: configHeaderRowHeight,
    rowHeightState: headerRowHeightState,
    onChangeRowHeight: onChangeHeaderRowHeight,
  });

  const { rowHeight, rowHeightLines, onUpdateRowHeight, onUpdateRowHeightLines } = useRowHeight({
    storage,
    consumer,
    configRowHeight,
    rowHeightState,
    onChangeRowHeight,
  });

  return (
    <>
      {onChangeSampleSize && (
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
      )}
      {onChangeHeaderRowHeight && (
        <RowHeightSettings
          rowHeight={headerRowHeight}
          rowHeightLines={headerRowHeightLines}
          label={i18n.translate('unifiedDataTable.headerRowHeightLabel', {
            defaultMessage: 'Header row height',
          })}
          onChangeRowHeight={onUpdateHeaderRowHeight}
          onChangeRowHeightLines={onUpdateHeaderRowHeightLines}
          data-test-subj="unifiedDataTableHeaderHeightSettings"
          maxRowHeight={5}
        />
      )}
      {onChangeRowHeight && (
        <RowHeightSettings
          rowHeight={rowHeight}
          rowHeightLines={rowHeightLines}
          label={i18n.translate('unifiedDataTable.rowHeightLabel', {
            defaultMessage: 'Cell row height',
          })}
          onChangeRowHeight={onUpdateRowHeight}
          onChangeRowHeightLines={onUpdateRowHeightLines}
          data-test-subj="unifiedDataTableHeightSettings"
        />
      )}
    </>
  );
};
