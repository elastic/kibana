/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { assign, get } from 'lodash';

import { TimeseriesSeries as timeseries } from './vis_types/timeseries/series';
import { MetricSeries as metric } from './vis_types/metric/series';
import { TopNSeries as topN } from './vis_types/top_n/series';
import { TableSeries as table } from './vis_types/table/series';
import { GaugeSeries as gauge } from './vis_types/gauge/series';
import { MarkdownSeries as markdown } from './vis_types/markdown/series';
import { FormattedMessage } from '@kbn/i18n-react';
import { VisDataContext } from '../contexts/vis_data_context';

const lookup = {
  top_n: topN,
  table,
  metric,
  timeseries,
  gauge,
  markdown,
};

export class Series extends Component {
  state = {
    visible: true,
    selectedTab: 'metrics',
  };

  switchTab = (selectedTab) => {
    this.setState({ selectedTab });
  };

  handleChange = (part) => {
    if (this.props.onChange) {
      const { model } = this.props;
      const doc = assign({}, model, part);
      this.props.onChange(doc);
    }
  };

  togglePanelActivation = () => {
    const { model } = this.props;

    this.handleChange({
      hidden: !model.hidden,
    });
  };

  toggleVisible = (e) => {
    e.preventDefault();

    this.setState({
      visible: !this.state.visible,
    });
  };

  render() {
    const { panel } = this.props;
    const Component = lookup[panel.type];

    return Boolean(Component) ? (
      <VisDataContext.Consumer>
        {(visData) => {
          const series = get(visData, `${panel.id}.series`, []);
          const counter = {};
          const seriesQuantity = series.reduce((acc, value) => {
            counter[value.seriesId] = counter[value.seriesId] + 1 || 1;
            acc[value.seriesId] = counter[value.seriesId];
            return acc;
          }, {});

          return (
            <Component
              className={this.props.className}
              disableAdd={this.props.disableAdd}
              uiRestrictions={visData.uiRestrictions}
              seriesQuantity={seriesQuantity}
              disableDelete={this.props.disableDelete}
              fields={this.props.fields}
              name={this.props.name}
              onAdd={this.props.onAdd}
              onChange={this.handleChange}
              onClone={this.props.onClone}
              onDelete={this.props.onDelete}
              model={this.props.model}
              panel={this.props.panel}
              selectedTab={this.state.selectedTab}
              style={this.props.style}
              switchTab={this.switchTab}
              toggleVisible={this.toggleVisible}
              togglePanelActivation={this.togglePanelActivation}
              visible={this.state.visible}
              dragHandleProps={this.props.dragHandleProps}
              indexPatternForQuery={panel.index_pattern}
            />
          );
        }}
      </VisDataContext.Consumer>
    ) : (
      <FormattedMessage
        id="visTypeTimeseries.seriesConfig.missingSeriesComponentDescription"
        defaultMessage="Missing Series component for panel type: {panelType}"
        values={{ panelType: panel.type }}
      />
    );
  }
}

Series.defaultProps = {
  name: 'metrics',
};

Series.propTypes = {
  className: PropTypes.string,
  disableAdd: PropTypes.bool,
  disableDelete: PropTypes.bool,
  fields: PropTypes.object,
  name: PropTypes.string,
  onAdd: PropTypes.func,
  onChange: PropTypes.func,
  onClone: PropTypes.func,
  onDelete: PropTypes.func,
  model: PropTypes.object,
  panel: PropTypes.object,
  dragHandleProps: PropTypes.object,
};
