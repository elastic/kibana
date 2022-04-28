/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { memo, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { htmlIdGenerator, EuiButtonIcon, useEuiTheme } from '@elastic/eui';
import { Position } from '@elastic/charts';
import { css } from '@emotion/react';

export interface LegendToggleProps {
  onClick: () => void;
  showLegend: boolean;
  legendPosition: Position;
}

const LegendToggleComponent = ({ onClick, showLegend, legendPosition }: LegendToggleProps) => {
  const legendId = useMemo(() => htmlIdGenerator()('legend'), []);
  const { euiTheme } = useEuiTheme();

  const baseStyles = useMemo(
    () => css`
      position: absolute;
      bottom: 0;
      left: 0;
      z-index: 1;
      margin: ${euiTheme.size.xs};
    `,
    [euiTheme.size.xs]
  );

  const isOpenStyle = useMemo(
    () => css`
      background-color: ${euiTheme.colors.lightestShade};
    `,
    [euiTheme.colors.lightestShade]
  );

  const positionStyle = useMemo(
    () => css`
      left: auto;
      bottom: auto;
      right: 0;
      top: 0;
    `,
    []
  );

  return (
    <EuiButtonIcon
      type="button"
      iconType="list"
      color="text"
      onClick={onClick}
      css={[
        baseStyles,
        showLegend ? isOpenStyle : null,
        ['left', 'bottom'].includes(legendPosition) ? positionStyle : null,
      ]}
      aria-label={i18n.translate('charts.legend.toggleLegendButtonAriaLabel', {
        defaultMessage: 'Toggle legend',
      })}
      aria-expanded={showLegend}
      aria-controls={legendId}
      isSelected={showLegend}
      data-test-subj="vislibToggleLegend"
      title={i18n.translate('charts.legend.toggleLegendButtonTitle', {
        defaultMessage: 'Toggle legend',
      })}
    />
  );
};

export const LegendToggle = memo(LegendToggleComponent);
