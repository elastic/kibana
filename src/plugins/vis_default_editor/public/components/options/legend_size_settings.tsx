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
import { LegendSize, DEFAULT_LEGEND_SIZE } from '@kbn/visualizations-plugin/public';

const legendSizeOptions: Array<{ value: LegendSize; inputDisplay: string }> = [
  {
    value: LegendSize.SMALL,
    inputDisplay: i18n.translate(
      'visDefaultEditor.options.legendSizeSetting.legendSizeOptions.small',
      {
        defaultMessage: 'Small',
      }
    ),
  },
  {
    value: LegendSize.MEDIUM,
    inputDisplay: i18n.translate(
      'visDefaultEditor.options.legendSizeSetting.legendSizeOptions.medium',
      {
        defaultMessage: 'Medium',
      }
    ),
  },
  {
    value: LegendSize.LARGE,
    inputDisplay: i18n.translate(
      'visDefaultEditor.options.legendSizeSetting.legendSizeOptions.large',
      {
        defaultMessage: 'Large',
      }
    ),
  },
  {
    value: LegendSize.EXTRA_LARGE,
    inputDisplay: i18n.translate(
      'visDefaultEditor.options.legendSizeSetting.legendSizeOptions.extraLarge',
      {
        defaultMessage: 'Extra large',
      }
    ),
  },
];

interface LegendSizeSettingsProps {
  legendSize?: LegendSize;
  onLegendSizeChange: (size?: LegendSize) => void;
  isVerticalLegend: boolean;
  showAutoOption: boolean;
}

export const LegendSizeSettings = ({
  legendSize,
  onLegendSizeChange,
  isVerticalLegend,
  showAutoOption,
}: LegendSizeSettingsProps) => {
  useEffect(() => {
    if (legendSize && !isVerticalLegend) {
      onLegendSizeChange(undefined);
    }
  }, [isVerticalLegend, legendSize, onLegendSizeChange]);

  const onLegendSizeOptionChange = useCallback(
    (size: LegendSize) => onLegendSizeChange(size === DEFAULT_LEGEND_SIZE ? undefined : size),
    [onLegendSizeChange]
  );

  const options = showAutoOption
    ? [
        {
          value: LegendSize.AUTO,
          inputDisplay: i18n.translate(
            'visDefaultEditor.options.legendSizeSetting.legendSizeOptions.auto',
            {
              defaultMessage: 'Auto',
            }
          ),
        },
        ...legendSizeOptions,
      ]
    : legendSizeOptions;

  const legendSizeSelect = (
    <EuiSuperSelect
      fullWidth
      compressed
      valueOfSelected={legendSize ?? DEFAULT_LEGEND_SIZE}
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
