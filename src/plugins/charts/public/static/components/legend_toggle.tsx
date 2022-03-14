/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { memo, useMemo } from 'react';
import classNames from 'classnames';

import { i18n } from '@kbn/i18n';
import { htmlIdGenerator, EuiButtonIcon } from '@elastic/eui';
import { Position } from '@elastic/charts';

import './legend_toggle.scss';

interface LegendToggleProps {
  onClick: () => void;
  showLegend: boolean;
  legendPosition: Position;
}

const LegendToggleComponent = ({ onClick, showLegend, legendPosition }: LegendToggleProps) => {
  const legendId = useMemo(() => htmlIdGenerator()('legend'), []);

  return (
    <EuiButtonIcon
      type="button"
      iconType="list"
      color="text"
      onClick={onClick}
      className={classNames('echLegend__toggle', `echLegend__toggle--position-${legendPosition}`, {
        'echLegend__toggle--isOpen': showLegend,
      })}
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
