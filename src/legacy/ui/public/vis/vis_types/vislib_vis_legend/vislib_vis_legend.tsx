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
import React, { useState, useEffect, BaseSyntheticEvent, KeyboardEvent, memo } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

import { htmlIdGenerator } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { EuiIcon, keyCodes } from '@elastic/eui';

import { getTableAggs } from 'ui/visualize/loader/pipeline_helpers/utilities';

// @ts-ignore
import { Data } from '../../../vislib/lib/data';
// @ts-ignore
import { createFiltersFromEvent } from '../../vis_filters';
import { CUSTOM_LEGEND_VIS_TYPES, LegendItem } from './models';
import { VisLegendItem } from './vislib_vis_legend_item';

interface Props {
  vis: any;
  visData: any;
  uiState: any;
  refreshLegend: number;
}

let getColor: (label: string) => string;

const VisLegendComponent = ({ vis, visData, uiState, refreshLegend }: Props) => {
  const [open, setOpen] = useState(uiState.get('vis.legendOpen', true));
  const [labels, setLabels] = useState<any[]>([]);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const [tableAggs, setTableAggs] = useState<any[]>([]);
  const legendId = htmlIdGenerator()('legend');

  useEffect(() => {
    if (visData) {
      refresh();
    }
  }, [refreshLegend]);

  const toggleLegend = () => {
    const bwcAddLegend = vis.params.addLegend;
    const bwcLegendStateDefault = bwcAddLegend == null ? true : bwcAddLegend;
    const newOpen = !uiState.get('vis.legendOpen', bwcLegendStateDefault);
    setOpen(newOpen);
    // open should be applied on template before we update uiState
    setTimeout(() => {
      uiState.set('vis.legendOpen', newOpen);
    });
  };

  const setColor = (label: string, color: string) => (event: BaseSyntheticEvent) => {
    if ((event as KeyboardEvent).keyCode && (event as KeyboardEvent).keyCode !== keyCodes.ENTER) {
      return;
    }

    const colors = uiState.get('vis.colors') || {};
    if (colors[label] === color) delete colors[label];
    else colors[label] = color;
    uiState.setSilent('vis.colors', null);
    uiState.set('vis.colors', colors);
    uiState.emit('colorChanged');
    refresh();
  };

  const filter = ({ values: data }: LegendItem, negate: boolean) => () => {
    vis.API.events.filter({ data, negate });
  };

  const canFilter = (item: LegendItem): boolean => {
    if (CUSTOM_LEGEND_VIS_TYPES.includes(vis.vislibVis.visConfigArgs.type)) {
      return false;
    }
    const filters = createFiltersFromEvent({ aggConfigs: tableAggs, data: item.values });
    return Boolean(filters.length);
  };

  const toggleDetails = (label: string | null) => (event?: BaseSyntheticEvent) => {
    if (
      event &&
      (event as KeyboardEvent).keyCode &&
      (event as KeyboardEvent).keyCode !== keyCodes.ENTER
    ) {
      return;
    }
    setSelectedLabel(selectedLabel === label ? null : label);
  };

  function getSeriesLabels(data: any[]) {
    const values = data.map(chart => chart.series).reduce((a, b) => a.concat(b), []);

    return _.compact(_.uniq(values, 'label')).map((label: any) => ({
      ...label,
      values: [label.values[0].seriesRaw],
    }));
  }

  // Most of these functions were moved directly from the old Legend class. Not a fan of this.
  const getLabels = (data: any, type: string) => {
    if (!data) return [];
    data = data.columns || data.rows || [data];

    if (type === 'pie') return Data.prototype.pieNames(data);

    return getSeriesLabels(data);
  };

  const refresh = () => {
    const vislibVis = vis.vislibVis;
    if (!vislibVis || !vislibVis.visConfig) {
      setLabels([
        {
          label: i18n.translate('common.ui.vis.visTypes.legend.loadingLabel', {
            defaultMessage: 'loading…',
          }),
        },
      ]);
      return;
    } // make sure vislib is defined at this point

    if (uiState.get('vis.legendOpen') == null && vis.params.addLegend != null) {
      setOpen(vis.params.addLegend);
    }

    if (CUSTOM_LEGEND_VIS_TYPES.includes(vislibVis.visConfigArgs.type)) {
      const legendLabels = vislibVis.getLegendLabels();
      if (legendLabels) {
        setLabels(
          _.map(legendLabels, label => {
            return { label };
          })
        );
      }
    } else {
      setLabels(getLabels(visData, vislibVis.visConfigArgs.type));
    }

    if (vislibVis.visConfig) {
      getColor = vislibVis.visConfig.data.getColorFunc();
    }

    setTableAggs(getTableAggs(vis));
  };

  const highlight = (event: BaseSyntheticEvent) => {
    const el = event.currentTarget;
    const handler = vis.vislibVis && vis.vislibVis.handler;

    // there is no guarantee that a Chart will set the highlight-function on its handler
    if (!handler || typeof handler.highlight !== 'function') {
      return;
    }
    handler.highlight.call(el, handler.el);
  };

  const unhighlight = (event: BaseSyntheticEvent) => {
    const el = event.currentTarget;
    const handler = vis.vislibVis && vis.vislibVis.handler;
    // there is no guarantee that a Chart will set the unhighlight-function on its handler
    if (!handler || typeof handler.unHighlight !== 'function') {
      return;
    }
    handler.unHighlight.call(el, handler.el);
  };

  const renderLegend = () => (
    <ul className="visLegend__list" id={legendId}>
      {labels.map(item => (
        <VisLegendItem
          item={item}
          key={item.label}
          selected={selectedLabel === item.label}
          canFilter={canFilter(item)}
          onFilter={filter}
          onSelect={toggleDetails}
          legendId={legendId}
          setColor={setColor}
          getColor={getColor}
          highlight={highlight}
          unhighlight={unhighlight}
        />
      ))}
    </ul>
  );

  return (
    <div className="visLegend">
      <button
        type="button"
        onClick={toggleLegend}
        className={classNames([
          'kuiCollapseButton visLegend__toggle',
          { 'visLegend__toggle--isOpen': open },
        ])}
        aria-label={i18n.translate('common.ui.vis.visTypes.legend.toggleLegendButtonAriaLabel', {
          defaultMessage: 'Toggle legend',
        })}
        aria-expanded={Boolean(open)}
        aria-controls={legendId}
        data-test-subj="vislibToggleLegend"
        title={i18n.translate('common.ui.vis.visTypes.legend.toggleLegendButtonTitle', {
          defaultMessage: 'Toggle legend',
        })}
      >
        <EuiIcon type="list" />
      </button>
      {open && renderLegend()}
    </div>
  );
};

VisLegendComponent.propTypes = {
  vis: PropTypes.object,
  visData: PropTypes.object,
  visParams: PropTypes.object,
  uiState: PropTypes.object,
  refreshLegend: PropTypes.number,
};

export const VisLegend = memo(
  VisLegendComponent,
  (prev, next) => prev.refreshLegend === next.refreshLegend
);
