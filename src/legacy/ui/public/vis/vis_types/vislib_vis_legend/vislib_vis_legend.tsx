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
import React, { BaseSyntheticEvent, KeyboardEvent, PureComponent } from 'react';
import classNames from 'classnames';
import { compact, uniq, map } from 'lodash';

import { i18n } from '@kbn/i18n';
import { EuiPopoverProps, EuiIcon, keyCodes, htmlIdGenerator } from '@elastic/eui';

// @ts-ignore
import { Data } from '../../../vislib/lib/data';
// @ts-ignore
import { createFiltersFromEvent } from '../../../../../core_plugins/visualizations/public';
import { CUSTOM_LEGEND_VIS_TYPES, LegendItem } from './models';
import { VisLegendItem } from './vislib_vis_legend_item';
import { getTableAggs } from '../../../visualize/loader/pipeline_helpers/utilities';

export interface VisLegendProps {
  vis: any;
  vislibVis: any;
  visData: any;
  uiState: any;
  position: 'top' | 'bottom' | 'left' | 'right';
}

export interface VisLegendState {
  open: boolean;
  labels: any[];
  tableAggs: any[];
  selectedLabel: string | null;
}

export class VisLegend extends PureComponent<VisLegendProps, VisLegendState> {
  legendId = htmlIdGenerator()('legend');
  getColor: (label: string) => string = () => '';

  constructor(props: VisLegendProps) {
    super(props);
    const open = props.uiState.get('vis.legendOpen', true);

    this.state = {
      open,
      labels: [],
      tableAggs: [],
      selectedLabel: null,
    };
  }

  componentDidMount() {
    this.refresh();
  }

  toggleLegend = () => {
    const bwcAddLegend = this.props.vis.params.addLegend;
    const bwcLegendStateDefault = bwcAddLegend == null ? true : bwcAddLegend;
    const newOpen = !this.props.uiState.get('vis.legendOpen', bwcLegendStateDefault);
    this.setState({ open: newOpen });
    // open should be applied on template before we update uiState
    setTimeout(() => {
      this.props.uiState.set('vis.legendOpen', newOpen);
    });
  };

  setColor = (label: string, color: string) => (event: BaseSyntheticEvent) => {
    if ((event as KeyboardEvent).keyCode && (event as KeyboardEvent).keyCode !== keyCodes.ENTER) {
      return;
    }

    const colors = this.props.uiState.get('vis.colors') || {};
    if (colors[label] === color) delete colors[label];
    else colors[label] = color;
    this.props.uiState.setSilent('vis.colors', null);
    this.props.uiState.set('vis.colors', colors);
    this.props.uiState.emit('colorChanged');
    this.refresh();
  };

  filter = ({ values: data }: LegendItem, negate: boolean) => {
    this.props.vis.API.events.filter({ data, negate });
  };

  canFilter = (item: LegendItem): boolean => {
    if (CUSTOM_LEGEND_VIS_TYPES.includes(this.props.vislibVis.visConfigArgs.type)) {
      return false;
    }
    const filters = createFiltersFromEvent({ aggConfigs: this.state.tableAggs, data: item.values });
    return Boolean(filters.length);
  };

  toggleDetails = (label: string | null) => (event?: BaseSyntheticEvent) => {
    if (
      event &&
      (event as KeyboardEvent).keyCode &&
      (event as KeyboardEvent).keyCode !== keyCodes.ENTER
    ) {
      return;
    }
    this.setState({ selectedLabel: this.state.selectedLabel === label ? null : label });
  };

  getSeriesLabels = (data: any[]) => {
    const values = data.map(chart => chart.series).reduce((a, b) => a.concat(b), []);

    return compact(uniq(values, 'label')).map((label: any) => ({
      ...label,
      values: [label.values[0].seriesRaw],
    }));
  };

  // Most of these functions were moved directly from the old Legend class. Not a fan of this.
  getLabels = (data: any, type: string) => {
    if (!data) return [];
    data = data.columns || data.rows || [data];

    if (type === 'pie') return Data.prototype.pieNames(data);

    return this.getSeriesLabels(data);
  };

  refresh = () => {
    const vislibVis = this.props.vislibVis;
    if (!vislibVis || !vislibVis.visConfig) {
      this.setState({
        labels: [
          {
            label: i18n.translate('common.ui.vis.visTypes.legend.loadingLabel', {
              defaultMessage: 'loading…',
            }),
          },
        ],
      });
      return;
    } // make sure vislib is defined at this point

    if (
      this.props.uiState.get('vis.legendOpen') == null &&
      this.props.vis.params.addLegend != null
    ) {
      this.setState({ open: this.props.vis.params.addLegend });
    }

    if (CUSTOM_LEGEND_VIS_TYPES.includes(vislibVis.visConfigArgs.type)) {
      const legendLabels = this.props.vislibVis.getLegendLabels();
      if (legendLabels) {
        this.setState({
          labels: map(legendLabels, label => {
            return { label };
          }),
        });
      }
    } else {
      this.setState({ labels: this.getLabels(this.props.visData, vislibVis.visConfigArgs.type) });
    }

    if (vislibVis.visConfig) {
      this.getColor = this.props.vislibVis.visConfig.data.getColorFunc();
    }

    this.setState({ tableAggs: getTableAggs(this.props.vis) });
  };

  highlight = (event: BaseSyntheticEvent) => {
    const el = event.currentTarget;
    const handler = this.props.vislibVis && this.props.vislibVis.handler;

    // there is no guarantee that a Chart will set the highlight-function on its handler
    if (!handler || typeof handler.highlight !== 'function') {
      return;
    }
    handler.highlight.call(el, handler.el);
  };

  unhighlight = (event: BaseSyntheticEvent) => {
    const el = event.currentTarget;
    const handler = this.props.vislibVis && this.props.vislibVis.handler;

    // there is no guarantee that a Chart will set the unhighlight-function on its handler
    if (!handler || typeof handler.unHighlight !== 'function') {
      return;
    }
    handler.unHighlight.call(el, handler.el);
  };

  getAnchorPosition = () => {
    const { position } = this.props;

    switch (position) {
      case 'bottom':
        return 'upCenter';
      case 'left':
        return 'rightUp';
      case 'right':
        return 'leftUp';
      default:
        return 'downCenter';
    }
  };

  renderLegend = (anchorPosition: EuiPopoverProps['anchorPosition']) => (
    <ul className="visLegend__list" id={this.legendId}>
      {this.state.labels.map(item => (
        <VisLegendItem
          item={item}
          key={item.label}
          anchorPosition={anchorPosition}
          selected={this.state.selectedLabel === item.label}
          canFilter={this.canFilter(item)}
          onFilter={this.filter}
          onSelect={this.toggleDetails}
          legendId={this.legendId}
          setColor={this.setColor}
          getColor={this.getColor}
          onHighlight={this.highlight}
          onUnhighlight={this.unhighlight}
        />
      ))}
    </ul>
  );

  render() {
    const { open } = this.state;
    const anchorPosition = this.getAnchorPosition();

    return (
      <div className="visLegend">
        <button
          type="button"
          onClick={this.toggleLegend}
          className={classNames('visLegend__toggle kbn-resetFocusState', {
            'visLegend__toggle--isOpen': open,
          })}
          aria-label={i18n.translate('common.ui.vis.visTypes.legend.toggleLegendButtonAriaLabel', {
            defaultMessage: 'Toggle legend',
          })}
          aria-expanded={Boolean(open)}
          aria-controls={this.legendId}
          data-test-subj="vislibToggleLegend"
          title={i18n.translate('common.ui.vis.visTypes.legend.toggleLegendButtonTitle', {
            defaultMessage: 'Toggle legend',
          })}
        >
          <EuiIcon color="text" type="list" />
        </button>
        {open && this.renderLegend(anchorPosition)}
      </div>
    );
  }
}
