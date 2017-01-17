import React from 'react';
import _ from 'lodash';

import timeseries from './series/timeseries/series';
import metric from './series/metric/series';
import topN from './series/top_n/series';
import gauge from './series/gauge/series';
import markdown from './series/markdown/series';
import { sortable } from 'react-anything-sortable';

const lookup = {
  top_n: topN,
  metric,
  timeseries,
  gauge,
  markdown
};

export default sortable(React.createClass({

  getInitialState() {
    return {
      visible: true,
      selectedTab: 'metrics'
    };
  },

  getDefaultProps() {
    return { name: 'metrics' };
  },

  switchTab(selectedTab) {
    this.setState({ selectedTab });
  },

  handleChange(part) {
    if (this.props.onChange) {
      const { model } = this.props;
      const doc = _.assign({}, model, part);
      this.props.onChange(doc);
    }
  },

  toggleVisible(e) {
    e.preventDefault();
    this.setState({ visible: !this.state.visible });
  },

  render() {
    const { panel } = this.props;
    const Component = lookup[panel.type];
    if (Component) {
      const params = {
        switchTab: this.switchTab,
        handleChange: this.handleChange,
        toggleVisible: this.toggleVisible,
        ...this.state,
        ...this.props
      };
      return (<Component {...params}/>);
    }
    return (<div>Missing Series component for panel type: {panel.type}</div>);
  }
}));
