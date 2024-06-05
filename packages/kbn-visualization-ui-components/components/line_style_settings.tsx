/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, memo } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButtonGroup,
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
} from '@elastic/eui';
import { LineStyle } from '../types';

interface LineStyleConfig {
  lineStyle?: LineStyle;
  lineWidth?: number;
}

export const LineStyleSettings = ({
  currentConfig,
  setConfig,
  idPrefix,
}: {
  currentConfig?: LineStyleConfig;
  setConfig: (config: LineStyleConfig) => void;
  idPrefix: string;
}) => {
  return (
    <>
      <EuiFormRow
        display="columnCompressed"
        fullWidth
        label={i18n.translate('visualizationUiComponents.xyChart.lineStyle.label', {
          defaultMessage: 'Line',
        })}
      >
        <EuiFlexGroup gutterSize="s" justifyContent="spaceBetween" responsive={false}>
          <EuiFlexItem>
            <LineThicknessSlider
              value={currentConfig?.lineWidth || 1}
              onChange={(value) => {
                setConfig({ lineWidth: value });
              }}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonGroup
              legend={i18n.translate('visualizationUiComponents.xyChart.lineStyle.label', {
                defaultMessage: 'Line',
              })}
              data-test-subj="lnsXY_line_style"
              name="lineStyle"
              buttonSize="compressed"
              options={[
                {
                  id: `${idPrefix}solid`,
                  label: i18n.translate('visualizationUiComponents.xyChart.lineStyle.solid', {
                    defaultMessage: 'Solid',
                  }),
                  'data-test-subj': 'lnsXY_line_style_solid',
                  iconType: 'lineSolid',
                },
                {
                  id: `${idPrefix}dashed`,
                  label: i18n.translate('visualizationUiComponents.xyChart.lineStyle.dashed', {
                    defaultMessage: 'Dashed',
                  }),
                  'data-test-subj': 'lnsXY_line_style_dashed',
                  iconType: 'lineDashed',
                },
                {
                  id: `${idPrefix}dotted`,
                  label: i18n.translate('visualizationUiComponents.xyChart.lineStyle.dotted', {
                    defaultMessage: 'Dotted',
                  }),
                  'data-test-subj': 'lnsXY_line_style_dotted',
                  iconType: 'lineDotted',
                },
              ]}
              idSelected={`${idPrefix}${currentConfig?.lineStyle || 'solid'}`}
              onChange={(id) => {
                const newMode = id.replace(idPrefix, '') as Exclude<LineStyle, 'dot-dashed'>;
                setConfig({ lineStyle: newMode });
              }}
              isIconOnly
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFormRow>
    </>
  );
};

const minRange = 1;
const maxRange = 10;

function getSafeValue(value: number | '', prevValue: number, min: number, max: number) {
  if (value === '') {
    return prevValue;
  }
  return Math.max(minRange, Math.min(value, maxRange));
}

const LineThicknessSlider = memo(
  ({ value, onChange }: { value: number; onChange: (value: number) => void }) => {
    const [unsafeValue, setUnsafeValue] = useState<string>(String(value));

    return (
      <EuiFieldNumber
        data-test-subj="lnsXYThickness"
        value={unsafeValue}
        fullWidth
        min={minRange}
        max={maxRange}
        step={1}
        append="px"
        compressed
        onChange={({ currentTarget: { value: newValue } }) => {
          setUnsafeValue(newValue);
          const convertedValue = newValue === '' ? '' : Number(newValue);
          const safeValue = getSafeValue(Number(newValue), Number(newValue), minRange, maxRange);
          // only update onChange is the value is valid and in range
          if (convertedValue === safeValue) {
            onChange(safeValue);
          }
        }}
        onBlur={() => {
          if (unsafeValue !== String(value)) {
            const safeValue = getSafeValue(
              unsafeValue === '' ? unsafeValue : Number(unsafeValue),
              value,
              minRange,
              maxRange
            );
            onChange(safeValue);
            setUnsafeValue(String(safeValue));
          }
        }}
      />
    );
  }
);
