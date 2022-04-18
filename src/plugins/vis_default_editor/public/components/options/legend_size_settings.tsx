/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiFormRow, EuiSuperSelect, EuiToolTip } from '@elastic/eui';
import { LegendSizes, DEFAULT_LEGEND_SIZE } from '@kbn/visualizations-plugin/public';

const legendSizeOptions: Array<{ value: string; inputDisplay: string }> = [
  {
    value: LegendSizes.SMALL.toString(),
    inputDisplay: i18n.translate(
      'visDefaultEditor.options.legendSizeSetting.legendSizeOptions.small',
      {
        defaultMessage: 'Small',
      }
    ),
  },
  {
    value: LegendSizes.MEDIUM.toString(),
    inputDisplay: i18n.translate(
      'visDefaultEditor.options.legendSizeSetting.legendSizeOptions.medium',
      {
        defaultMessage: 'Medium',
      }
    ),
  },
  {
    value: LegendSizes.LARGE.toString(),
    inputDisplay: i18n.translate(
      'visDefaultEditor.options.legendSizeSetting.legendSizeOptions.large',
      {
        defaultMessage: 'Large',
      }
    ),
  },
  {
    value: LegendSizes.EXTRA_LARGE.toString(),
    inputDisplay: i18n.translate(
      'visDefaultEditor.options.legendSizeSetting.legendSizeOptions.extraLarge',
      {
        defaultMessage: 'Extra large',
      }
    ),
  },
];

interface LegendSizeSettingsProps {
  legendSize?: number;
  onLegendSizeChange: (size?: number) => void;
  isVerticalLegend: boolean;
}

export const LegendSizeSettings = ({
  legendSize,
  onLegendSizeChange,
  isVerticalLegend,
}: LegendSizeSettingsProps) => {
  useEffect(() => {
    if (legendSize && !isVerticalLegend) {
      onLegendSizeChange(undefined);
    }
  }, [isVerticalLegend, legendSize, onLegendSizeChange]);

  const onLegendSizeOptionChange = useCallback(
    (option) => onLegendSizeChange(option === DEFAULT_LEGEND_SIZE ? undefined : Number(option)),
    [onLegendSizeChange]
  );

  const options =
    legendSize !== LegendSizes.AUTO
      ? legendSizeOptions
      : [
          {
            value: LegendSizes.AUTO.toString(),
            inputDisplay: i18n.translate(
              'visDefaultEditor.options.legendSizeSetting.legendSizeOptions.auto',
              {
                defaultMessage: 'Auto',
              }
            ),
          },
          ...legendSizeOptions,
        ];

  const legendSizeSelect = (
    <EuiSuperSelect
      fullWidth
      compressed
      valueOfSelected={legendSize?.toString() || DEFAULT_LEGEND_SIZE.toString()}
      options={options}
      onChange={onLegendSizeOptionChange}
      disabled={!isVerticalLegend}
    />
  );

  return (
    <EuiFormRow
      fullWidth
      label={
        <FormattedMessage
          id="visDefaultEditor.options.legendSizeSetting.label"
          defaultMessage="Legend size"
        />
      }
    >
      {isVerticalLegend ? (
        legendSizeSelect
      ) : (
        <EuiToolTip
          content={i18n.translate('visDefaultEditor.options.legendSizeSetting.legendVertical', {
            defaultMessage: 'Requires legend to be right or left aligned',
          })}
          position="top"
          delay="regular"
          display="block"
        >
          {legendSizeSelect}
        </EuiToolTip>
      )}
    </EuiFormRow>
  );
};
