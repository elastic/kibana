/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { EuiFormRow, EuiHorizontalRule, EuiRange } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { debounce } from 'lodash';
import { RowHeightSettings, RowHeightSettingsProps } from './row_height_settings';

export const DEFAULT_MAX_ALLOWED_SAMPLE_SIZE = 1000;
export const MIN_ALLOWED_SAMPLE_SIZE = 1;
export const RANGE_MIN_SAMPLE_SIZE = 10; // it's necessary to be able to use `step={10}` configuration for EuiRange
export const RANGE_STEP_SAMPLE_SIZE = 10;

export interface UnifiedDataTableAdditionalDisplaySettingsProps {
  rowHeight: RowHeightSettingsProps['rowHeight'];
  rowHeightLines: RowHeightSettingsProps['rowHeightLines'];
  onChangeRowHeight?: (rowHeight: RowHeightSettingsProps['rowHeight']) => void;
  onChangeRowHeightLines?: (rowHeightLines: number) => void;
  headerRowHeight: RowHeightSettingsProps['rowHeight'];
  headerRowHeightLines: RowHeightSettingsProps['rowHeightLines'];
  onChangeHeaderRowHeight?: (headerRowHeight: RowHeightSettingsProps['rowHeight']) => void;
  onChangeHeaderRowHeightLines?: (headerRowHeightLines: number) => void;
  maxAllowedSampleSize?: number;
  sampleSize: number;
  onChangeSampleSize?: (sampleSize: number) => void;
}

const defaultOnChangeSampleSize = () => {};

export const UnifiedDataTableAdditionalDisplaySettings: React.FC<
  UnifiedDataTableAdditionalDisplaySettingsProps
> = ({
  rowHeight,
  rowHeightLines,
  onChangeRowHeight,
  onChangeRowHeightLines,
  headerRowHeight,
  headerRowHeightLines,
  onChangeHeaderRowHeight,
  onChangeHeaderRowHeightLines,
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
    () =>
      debounce(onChangeSampleSize ?? defaultOnChangeSampleSize, 300, {
        leading: false,
        trailing: true,
      }),
    [onChangeSampleSize]
  );

  const onChangeActiveSampleSize = useCallback(
    (event) => {
      if (!event.target.value) {
        setActiveSampleSize('');
        return;
      }

      const newSampleSize = parseInt(event.target.value, 10) ?? RANGE_MIN_SAMPLE_SIZE;

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

  const settings = [];

  if (onChangeHeaderRowHeight && onChangeHeaderRowHeightLines) {
    settings.push(
      <RowHeightSettings
        rowHeight={headerRowHeight}
        rowHeightLines={headerRowHeightLines}
        label={i18n.translate('unifiedDataTable.headerRowHeightLabel', {
          defaultMessage: 'Header row height',
        })}
        onChangeRowHeight={onChangeHeaderRowHeight}
        onChangeRowHeightLines={onChangeHeaderRowHeightLines}
        data-test-subj="unifiedDataTableHeaderRowHeightSettings"
        maxRowHeight={5}
      />
    );
  }

  if (onChangeRowHeight && onChangeRowHeightLines) {
    settings.push(
      <RowHeightSettings
        rowHeight={rowHeight}
        rowHeightLines={rowHeightLines}
        label={i18n.translate('unifiedDataTable.rowHeightLabel', {
          defaultMessage: 'Cell row height',
        })}
        onChangeRowHeight={onChangeRowHeight}
        onChangeRowHeightLines={onChangeRowHeightLines}
        data-test-subj="unifiedDataTableRowHeightSettings"
      />
    );
  }

  if (onChangeSampleSize) {
    settings.push(
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
  }

  return (
    <>
      {settings.map((setting, index) => (
        <React.Fragment key={`setting-${index}`}>
          {index > 0 && <EuiHorizontalRule margin="s" />}
          {setting}
        </React.Fragment>
      ))}
    </>
  );
};
