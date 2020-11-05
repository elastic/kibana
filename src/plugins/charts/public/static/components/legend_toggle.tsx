/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
