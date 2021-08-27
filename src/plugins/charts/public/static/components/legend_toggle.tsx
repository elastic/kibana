/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { Position } from '@elastic/charts';
import { EuiButtonIcon, htmlIdGenerator } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import classNames from 'classnames';
import React, { memo, useMemo } from 'react';
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
      color="subdued"
      onClick={onClick}
      className={classNames('echLegend__toggle', `echLegend__toggle--position-${legendPosition}`, {
        // eslint-disable-next-line @typescript-eslint/naming-convention
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
