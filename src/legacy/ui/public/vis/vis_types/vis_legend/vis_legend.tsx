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
import React, { useState, useEffect, BaseSyntheticEvent, KeyboardEvent } from 'react';
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

export const CUSTOM_LEGEND_VIS_TYPES = ['heatmap', 'gauge'];

const legendColors: string[] = [
  '#3F6833',
  '#967302',
  '#2F575E',
  '#99440A',
  '#58140C',
  '#052B51',
  '#511749',
  '#3F2B5B', // 6
  '#508642',
  '#CCA300',
  '#447EBC',
  '#C15C17',
  '#890F02',
  '#0A437C',
  '#6D1F62',
  '#584477', // 2
  '#629E51',
  '#E5AC0E',
  '#64B0C8',
  '#E0752D',
  '#BF1B00',
  '#0A50A1',
  '#962D82',
  '#614D93', // 4
  '#7EB26D',
  '#EAB839',
  '#6ED0E0',
  '#EF843C',
  '#E24D42',
  '#1F78C1',
  '#BA43A9',
  '#705DA0', // Normal
  '#9AC48A',
  '#F2C96D',
  '#65C5DB',
  '#F9934E',
  '#EA6460',
  '#5195CE',
  '#D683CE',
  '#806EB7', // 5
  '#B7DBAB',
  '#F4D598',
  '#70DBED',
  '#F9BA8F',
  '#F29191',
  '#82B5D8',
  '#E5A8E2',
  '#AEA2E0', // 3
  '#E0F9D7',
  '#FCEACA',
  '#CFFAFF',
  '#F9E2D2',
  '#FCE2DE',
  '#BADFF4',
  '#F9D9F9',
  '#DEDAF7', // 7
];

interface Props {
  vis: any;
  refreshLegend: any;
  visData: any;
  visParams: any;
  uiState: any;
}

interface LegendItem {
  label: string;
  values: any[];
}

let getColor: (label: string) => string;

export const VisLegend = ({ vis, refreshLegend, visData, visParams, uiState }: Props) => {
  const [open, setOpen] = useState(uiState.get('vis.legendOpen', true));
  const [labels, setLabels] = useState<any[]>([]);
  const [tableAggs, setTableAggs] = useState<any[]>([]);
  const [shownDetails, setShownDetails] = useState<string | undefined>(undefined);
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

  const canFilter = (item: LegendItem) => {
    if (CUSTOM_LEGEND_VIS_TYPES.includes(vis.vislibVis.visConfigArgs.type)) {
      return false;
    }
    const filters = createFiltersFromEvent({ aggConfigs: tableAggs, data: item.values });
    return filters.length;
  };

  const toggleDetails = (label: string) => (event: BaseSyntheticEvent) => {
    if ((event as KeyboardEvent).keyCode && (event as KeyboardEvent).keyCode !== keyCodes.ENTER) {
      return;
    }
    setShownDetails(shownDetails === label ? undefined : label);
  };

  const areDetailsVisible = (label: string) => {
    return shownDetails === label;
  };

  /**
   * Keydown listener for a legend entry.
   * This will close the details panel of this legend entry when pressing Escape.
   */
  const onLegendEntryKeydown = (event: KeyboardEvent) => {
    if (event.keyCode === keyCodes.ESCAPE) {
      event.preventDefault();
      event.stopPropagation();
      setShownDetails(undefined);
    }
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
    const handler = vis.vislibVis.handler;

    // there is no guarantee that a Chart will set the highlight-function on its handler
    if (!handler || typeof handler.highlight !== 'function') {
      return;
    }
    handler.highlight.call(el, handler.el);
  };

  const unhighlight = (event: BaseSyntheticEvent) => {
    const el = event.currentTarget;
    const handler = vis.vislibVis.handler;
    // there is no guarantee that a Chart will set the unhighlight-function on its handler
    if (!handler || typeof handler.unHighlight !== 'function') {
      return;
    }
    handler.unHighlight.call(el, handler.el);
  };

  const renderDetails = (item: LegendItem) => (
    <div className="visLegend__valueDetails">
      {canFilter(item) && renderFilterBar(item)}

      <div className="visLegend__valueColorPicker" role="listbox">
        <span id={`${legendId}ColorPickerDesc`} className="euiScreenReaderOnly">
          {i18n.translate('common.ui.vis.visTypes.legend.setColorScreenReaderDescription', {
            defaultMessage: `Set color for value ${item.label}`,
          })}
        </span>
        {legendColors.map(color => (
          <i
            kbn-accessible-click="true"
            role="option"
            tabIndex={0}
            key={color}
            aria-label={color}
            aria-describedby={`${legendId}ColorPickerDesc`}
            aria-selected={color === getColor(item.label)}
            onClick={setColor(item.label, color)}
            onKeyPress={setColor(item.label, color)}
            className={classNames([
              'fa dot visLegend__valueColorPickerDot',
              color === getColor(item.label) ? 'fa-circle-o' : 'fa-circle',
            ])}
            style={{ color }}
            data-test-subj={`legendSelectColor-${color}`}
          />
        ))}
      </div>
    </div>
  );

  const renderFilterBar = (item: LegendItem) => (
    <div className="kuiButtonGroup kuiButtonGroup--united kuiButtonGroup--fullWidth">
      <button
        className="kuiButton kuiButton--basic kuiButton--small"
        onClick={filter(item, false)}
        aria-label={i18n.translate('common.ui.vis.visTypes.legend.filterForValueButtonAriaLabel', {
          defaultMessage: 'Filter for value {legendDataLabel}',
          values: { legendDataLabel: item.label },
        })}
        data-test-subj={`legend-${item.label}-filterIn`}
      >
        <span className="kuiIcon fa-search-plus" />
      </button>

      <button
        className="kuiButton kuiButton--basic kuiButton--small"
        onClick={filter(item, true)}
        aria-label={i18n.translate('common.ui.vis.visTypes.legend.filterOutValueButtonAriaLabel', {
          defaultMessage: 'Filter out value {legendDataLabel}',
          values: { legendDataLabel: item.label },
        })}
        data-test-subj={`legend-${item.label}-filterOut`}
      >
        <span className="kuiIcon fa-search-minus" />
      </button>
    </div>
  );

  const renderLegendItem = (item: LegendItem) => (
    <li key={item.label} className="visLegend__value color">
      <div
        onKeyDown={onLegendEntryKeydown}
        onMouseEnter={highlight}
        onFocus={highlight}
        onMouseLeave={unhighlight}
        onBlur={unhighlight}
        data-label={item.label}
      >
        <div
          kbn-accessible-click="true"
          data-label={item.label}
          onFocus={highlight}
          onBlur={unhighlight}
          onClick={toggleDetails(item.label)}
          onKeyPress={toggleDetails(item.label)}
          className={classNames([
            'visLegend__valueTitle',
            areDetailsVisible(item.label)
              ? 'visLegend__valueTitle--full'
              : 'visLegend__valueTitle--truncate',
          ])}
          title={item.label}
          aria-label={i18n.translate('common.ui.vis.visTypes.legend.toggleOptionsButtonAriaLabel', {
            defaultMessage: '{legendDataLabel}, toggle options',
            values: { legendDataLabel: item.label },
          })}
          data-test-subj={`legend-${item.label}`}
        >
          <i
            className="fa fa-circle"
            style={{ color: getColor(item.label) }}
            data-test-subj={`legendSelectedColor-${getColor(item.label)}`}
          />
          {item.label}
        </div>

        {areDetailsVisible(item.label) && renderDetails(item)}
      </div>
    </li>
  );

  const renderLegend = () => (
    <ul className="visLegend__list" id={legendId}>
      {labels.map(renderLegendItem)}
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

VisLegend.propTypes = {
  vis: PropTypes.object,
  refreshLegend: PropTypes.object,
  visData: PropTypes.object,
  visParams: PropTypes.object,
  uiState: PropTypes.object,
};
