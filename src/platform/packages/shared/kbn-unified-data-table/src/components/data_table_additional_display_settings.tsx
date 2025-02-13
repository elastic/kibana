/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { EuiFormRow, EuiHorizontalRule, EuiRange, EuiRangeProps, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { debounce } from 'lodash';
import { RowHeightSettings, RowHeightSettingsProps } from './row_height_settings';

export const DEFAULT_MAX_ALLOWED_SAMPLE_SIZE = 1000;
export const MIN_ALLOWED_SAMPLE_SIZE = 1;
export const RANGE_MIN_SAMPLE_SIZE = 10; // it's necessary to be able to use `step={10}` configuration for EuiRange
export const RANGE_STEP_SAMPLE_SIZE = 10;

export interface UnifiedDataTableAdditionalDisplaySettingsProps {
  rowHeight: RowHeightSettingsProps['rowHeight'];
  onChangeRowHeight?: (rowHeight: RowHeightSettingsProps['rowHeight']) => void;
  onChangeRowHeightLines?: (rowHeightLines: number) => void;
  headerRowHeight: RowHeightSettingsProps['rowHeight'];
  onChangeHeaderRowHeight?: (headerRowHeight: RowHeightSettingsProps['rowHeight']) => void;
  onChangeHeaderRowHeightLines?: (headerRowHeightLines: number) => void;
  maxAllowedSampleSize?: number;
  sampleSize: number;
  onChangeSampleSize?: (sampleSize: number) => void;
  lineCountInput: number;
  headerLineCountInput: number;
  densityControl?: React.ReactNode;
}

const defaultOnChangeSampleSize = () => {};

export const UnifiedDataTableAdditionalDisplaySettings: React.FC<
  UnifiedDataTableAdditionalDisplaySettingsProps
> = ({
  rowHeight,
  onChangeRowHeight,
  onChangeRowHeightLines,
  headerRowHeight,
  onChangeHeaderRowHeight,
  onChangeHeaderRowHeightLines,
  maxAllowedSampleSize = DEFAULT_MAX_ALLOWED_SAMPLE_SIZE,
  sampleSize,
  onChangeSampleSize,
  lineCountInput,
  headerLineCountInput,
  densityControl,
}) => {
  const [activeSampleSize, setActiveSampleSize] = useState<number | ''>(sampleSize);
  const minRangeSampleSize = Math.max(
    Math.min(RANGE_MIN_SAMPLE_SIZE, sampleSize),
    MIN_ALLOWED_SAMPLE_SIZE
  ); // flexible: allows to go lower than RANGE_MIN_SAMPLE_SIZE but greater than MIN_ALLOWED_SAMPLE_SIZE
  const { euiTheme } = useEuiTheme();

  const debouncedOnChangeSampleSize = useMemo(
    () =>
      debounce(onChangeSampleSize ?? defaultOnChangeSampleSize, 300, {
        leading: false,
        trailing: true,
      }),
    [onChangeSampleSize]
  );

  const onChangeActiveSampleSize = useCallback<NonNullable<EuiRangeProps['onChange']>>(
    (event) => {
      if (!('value' in event.target) || !event.target.value) {
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

  if (onChangeSampleSize) {
    let step = minRangeSampleSize === RANGE_MIN_SAMPLE_SIZE ? RANGE_STEP_SAMPLE_SIZE : 1;

    if (
      step > 1 &&
      ((activeSampleSize && !checkIfValueIsMultipleOfStep(activeSampleSize, step)) ||
        !checkIfValueIsMultipleOfStep(minRangeSampleSize, step) ||
        !checkIfValueIsMultipleOfStep(maxAllowedSampleSize, step))
    ) {
      step = 1; // Eui is very strict about step, so we need to switch to 1 if the value is not a multiple of the step
    }

    settings.push(
      <>
        <EuiFormRow label={sampleSizeLabel} display="columnCompressed">
          <EuiRange
            compressed
            fullWidth
            min={minRangeSampleSize}
            max={maxAllowedSampleSize}
            step={step}
            showInput
            value={activeSampleSize}
            onChange={onChangeActiveSampleSize}
            data-test-subj="unifiedDataTableSampleSizeInput"
            showRange
          />
        </EuiFormRow>
      </>
    );
  }

  if (Boolean(densityControl)) {
    settings.push(densityControl);
  }

  if (onChangeHeaderRowHeight && onChangeHeaderRowHeightLines) {
    settings.push(
      <RowHeightSettings
        rowHeight={headerRowHeight}
        label={i18n.translate('unifiedDataTable.headerRowHeightLabel', {
          defaultMessage: 'Max header cell lines',
        })}
        onChangeRowHeight={onChangeHeaderRowHeight}
        onChangeLineCountInput={onChangeHeaderRowHeightLines}
        data-test-subj="unifiedDataTableHeaderRowHeightSettings"
        maxRowHeight={5}
        lineCountInput={headerLineCountInput}
      />
    );
  }

  if (onChangeRowHeight && onChangeRowHeightLines) {
    settings.push(
      <RowHeightSettings
        rowHeight={rowHeight}
        label={i18n.translate('unifiedDataTable.rowHeightLabel', {
          defaultMessage: 'Body cell lines',
        })}
        onChangeRowHeight={onChangeRowHeight}
        onChangeLineCountInput={onChangeRowHeightLines}
        data-test-subj="unifiedDataTableRowHeightSettings"
        lineCountInput={lineCountInput}
      />
    );
  }

  // We want horizontal line after "Sample size" only if there are more controls below
  if (settings.length > 1 && onChangeSampleSize) {
    settings.splice(
      1,
      0,
      <EuiHorizontalRule
        margin="xs"
        css={{
          marginInlineStart: `-${euiTheme.size.s}`,
          marginInlineEnd: `-${euiTheme.size.s}`,
          inlineSize: 'unset',
        }}
      />
    );
  }

  return (
    <>
      {settings.map((setting, index) => (
        <React.Fragment key={`setting-${index}`}>{setting}</React.Fragment>
      ))}
    </>
  );
};

function checkIfValueIsMultipleOfStep(value: number, step: number) {
  return value % step === 0;
}
