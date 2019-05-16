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

import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { assign, get } from 'lodash';

import timeseries from './vis_types/timeseries/series';
import metric from './vis_types/metric/series';
import topN from './vis_types/top_n/series';
import table from './vis_types/table/series';
import gauge from './vis_types/gauge/series';
import markdown from './vis_types/markdown/series';
import { FormattedMessage } from '@kbn/i18n/react';

const lookup = {
  top_n: topN,
  table,
  metric,
  timeseries,
  gauge,
  markdown,
};

class Series extends Component {
  constructor(props) {
    super(props);

    this.state = {
      visible: true,
      selectedTab: 'metrics',
      uiRestrictions: undefined,
    };

    this.visDataSubscription = null;
  }

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

  componentDidMount() {
    if (this.props.visData$) {
      this.visDataSubscription = this.props.visData$
        .subscribe(visData => this.setState({
          uiRestrictions: get(visData, 'uiRestrictions'),
        }));
    }
  }

  render() {
    const { panel } = this.props;
    const Component = lookup[panel.type];

    const params = {
      className: this.props.className,
      disableAdd: this.props.disableAdd,
      disableDelete: this.props.disableDelete,
      fields: this.props.fields,
      name: this.props.name,
      onAdd: this.props.onAdd,
      onChange: this.handleChange,
      onClone: this.props.onClone,
      onDelete: this.props.onDelete,
      model: this.props.model,
      panel: this.props.panel,
      selectedTab: this.state.selectedTab,
      style: this.props.style,
      uiRestrictions: this.state.uiRestrictions,
      switchTab: this.switchTab,
      toggleVisible: this.toggleVisible,
      togglePanelActivation: this.togglePanelActivation,
      visible: this.state.visible,
      dragHandleProps: this.props.dragHandleProps,
    };

    return Boolean(Component) ?
      (<Component {...params}/>) :
      (<FormattedMessage
        id="tsvb.seriesConfig.missingSeriesComponentDescription"
        defaultMessage="Missing Series component for panel type: {panelType}"
        values={{ panelType: panel.type }}
      />);
  }

  componentWillUnmount() {
    if (this.visDataSubscription) {
      this.visDataSubscription.unsubscribe();
    }
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
  visData$: PropTypes.object,
  dragHandleProps: PropTypes.object,
};

export default Series;
