/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { EuiRangeProps } from '@elastic/eui';
import { EuiFormRow, EuiHorizontalRule, EuiRange, EuiSwitch, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { debounce } from 'lodash';
import type { RowHeightSettingsProps } from './row_height_settings';
import { RowHeightSettings } from './row_height_settings';
import type { JsonModeSettings, SourceDisplayMode } from '../types';
import { ViewModeSettings } from './view_mode_settings';

export const DEFAULT_MAX_ALLOWED_SAMPLE_SIZE = 1000;
export const MIN_ALLOWED_SAMPLE_SIZE = 1;
export const RANGE_MIN_SAMPLE_SIZE = 10; // it's necessary to be able to use `step={10}` configuration for EuiRange
export const RANGE_STEP_SAMPLE_SIZE = 10;

export interface UnifiedDataTableAdditionalDisplaySettingsProps {
  rowHeight: RowHeightSettingsProps['rowHeight'];
  onChangeRowHeight?: (rowHeight: RowHeightSettingsProps['rowHeight']) => void;
  onChangeRowHeightLines?: (rowHeightLines: number, isValid: boolean) => void;
  headerRowHeight: RowHeightSettingsProps['rowHeight'];
  onChangeHeaderRowHeight?: (headerRowHeight: RowHeightSettingsProps['rowHeight']) => void;
  onChangeHeaderRowHeightLines?: (headerRowHeightLines: number, isValid: boolean) => void;
  maxAllowedSampleSize?: number;
  sampleSize: number;
  onChangeSampleSize?: (sampleSize: number) => void;
  lineCountInput: number | undefined;
  headerLineCountInput: number | undefined;
  densityControl?: React.ReactNode;
  sourceDisplayMode: SourceDisplayMode;
  onChangeSourceDisplayMode?: (sourceDisplayMode: SourceDisplayMode) => void;
  jsonModeSettings: JsonModeSettings;
  onChangeJsonModeSettings?: (jsonModeSettings: JsonModeSettings) => void;
}

const defaultOnChangeSampleSize = () => {};

const DisplaySettingsHorizontalRule = () => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiHorizontalRule
      margin="xs"
      css={{
        marginInlineStart: `-${euiTheme.size.s}`,
        marginInlineEnd: `-${euiTheme.size.s}`,
        inlineSize: 'unset',
      }}
    />
  );
};

const SampleSizeSettings = ({
  activeSampleSize,
  minRangeSampleSize,
  maxAllowedSampleSize,
  onChangeActiveSampleSize,
}: {
  activeSampleSize: number | '';
  minRangeSampleSize: number;
  maxAllowedSampleSize: number;
  onChangeActiveSampleSize: NonNullable<EuiRangeProps['onChange']>;
}) => {
  let step = minRangeSampleSize === RANGE_MIN_SAMPLE_SIZE ? RANGE_STEP_SAMPLE_SIZE : 1;

  if (
    step > 1 &&
    ((activeSampleSize && !checkIfValueIsMultipleOfStep(activeSampleSize, step)) ||
      !checkIfValueIsMultipleOfStep(minRangeSampleSize, step) ||
      !checkIfValueIsMultipleOfStep(maxAllowedSampleSize, step))
  ) {
    step = 1; // Eui is very strict about step, so we need to switch to 1 if the value is not a multiple of the step
  }

  const sampleSizeLabel = i18n.translate('unifiedDataTable.sampleSizeSettings.sampleSizeLabel', {
    defaultMessage: 'Sample size',
  });

  return (
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
  );
};

const JsonModeDisplaySettings = ({
  jsonModeSettings,
  onChangeJsonModeSettings,
}: {
  jsonModeSettings: JsonModeSettings;
  onChangeJsonModeSettings?: (jsonModeSettings: JsonModeSettings) => void;
}) => {
  const hideNulls = jsonModeSettings.hideNulls ?? false;
  const wrapLines = jsonModeSettings.wrapLines ?? true;

  const hideNullsLabel = i18n.translate('unifiedDataTable.hideNullsLabel', {
    defaultMessage: 'Hide nulls',
  });

  const wrapLinesLabel = i18n.translate('unifiedDataTable.wrapLinesLabel', {
    defaultMessage: 'Wrap lines',
  });

  return (
    <>
      <EuiFormRow
        label={hideNullsLabel}
        display="columnCompressed"
        data-test-subj="unifiedDataTableHideNullsSettings"
      >
        <EuiSwitch
          label={hideNullsLabel}
          showLabel={false}
          checked={hideNulls}
          compressed
          onChange={(e) =>
            onChangeJsonModeSettings?.({ ...jsonModeSettings, hideNulls: e.target.checked })
          }
          data-test-subj="unifiedDataTableHideNullsSwitch"
        />
      </EuiFormRow>
      <EuiFormRow
        label={wrapLinesLabel}
        display="columnCompressed"
        data-test-subj="unifiedDataTableWrapLinesSettings"
      >
        <EuiSwitch
          label={wrapLinesLabel}
          showLabel={false}
          checked={wrapLines}
          compressed
          onChange={(e) =>
            onChangeJsonModeSettings?.({ ...jsonModeSettings, wrapLines: e.target.checked })
          }
          data-test-subj="unifiedDataTableWrapLinesSwitch"
        />
      </EuiFormRow>
    </>
  );
};

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
  sourceDisplayMode,
  onChangeSourceDisplayMode,
  jsonModeSettings,
  onChangeJsonModeSettings,
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

  useEffect(() => {
    setActiveSampleSize(sampleSize); // reset local state
  }, [sampleSize, setActiveSampleSize]);

  const isJsonMode = sourceDisplayMode === 'json';
  const viewModeSettings = onChangeSourceDisplayMode ? (
    <ViewModeSettings
      sourceDisplayMode={sourceDisplayMode}
      onChangeSourceDisplayMode={onChangeSourceDisplayMode}
    />
  ) : null;

  const showSampleSize = Boolean(onChangeSampleSize);
  const showDensity = !isJsonMode && Boolean(densityControl);
  const showHeaderRowHeight =
    !isJsonMode && Boolean(onChangeHeaderRowHeight && onChangeHeaderRowHeightLines);
  const showRowHeight = !isJsonMode && Boolean(onChangeRowHeight && onChangeRowHeightLines);
  const hasControlsAfterSampleSize =
    Boolean(viewModeSettings) || isJsonMode || showDensity || showHeaderRowHeight || showRowHeight;
  const hasControlsAfterViewMode =
    isJsonMode || showDensity || showHeaderRowHeight || showRowHeight;

  return (
    <>
      {showSampleSize && (
        <>
          <SampleSizeSettings
            activeSampleSize={activeSampleSize}
            minRangeSampleSize={minRangeSampleSize}
            maxAllowedSampleSize={maxAllowedSampleSize}
            onChangeActiveSampleSize={onChangeActiveSampleSize}
          />
          {hasControlsAfterSampleSize && <DisplaySettingsHorizontalRule />}
        </>
      )}
      {viewModeSettings}
      {viewModeSettings && hasControlsAfterViewMode && <DisplaySettingsHorizontalRule />}
      {isJsonMode && (
        <JsonModeDisplaySettings
          jsonModeSettings={jsonModeSettings}
          onChangeJsonModeSettings={onChangeJsonModeSettings}
        />
      )}
      {showDensity && densityControl}
      {showHeaderRowHeight && onChangeHeaderRowHeight && onChangeHeaderRowHeightLines && (
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
      )}
      {showRowHeight && onChangeRowHeight && onChangeRowHeightLines && (
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
      )}
    </>
  );
};

function checkIfValueIsMultipleOfStep(value: number, step: number) {
  return value % step === 0;
}
