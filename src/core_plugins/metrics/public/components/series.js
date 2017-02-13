import React, { Component, PropTypes } from 'react';
import _ from 'lodash';

import timeseries from './vis_types/timeseries/series';
import metric from './vis_types/metric/series';
import topN from './vis_types/top_n/series';
import gauge from './vis_types/gauge/series';
import markdown from './vis_types/markdown/series';
import { sortable } from 'react-anything-sortable';

const lookup = {
  top_n: topN,
  metric,
  timeseries,
  gauge,
  markdown
};

class Series extends Component {

  constructor(props) {
    super(props);
    this.state = {
      visible: true,
      selectedTab: 'metrics'
    };
    this.handleChange = this.handleChange.bind(this);
    this.switchTab = this.switchTab.bind(this);
    this.toggleVisible = this.toggleVisible.bind(this);
  }

  switchTab(selectedTab) {
    this.setState({ selectedTab });
  }

  handleChange(part) {
    if (this.props.onChange) {
      const { model } = this.props;
      const doc = _.assign({}, model, part);
      this.props.onChange(doc);
    }
  }

  toggleVisible(e) {
    e.preventDefault();
    this.setState({ visible: !this.state.visible });
  }

  render() {
    const { panel } = this.props;
    const Component = lookup[panel.type];
    if (Component) {
      const params = {
        className: this.props.className,
        colorPicker: this.props.colorPicker,
        disableAdd: this.props.disableAdd,
        disableDelete: this.props.disableDelete,
        fields: this.props.fields,
        name: this.props.name,
        onAdd: this.props.onAdd,
        onChange: this.handleChange,
        onClone: this.props.onClone,
        onDelete: this.props.onDelete,
        onMouseDown: this.props.onMouseDown,
        onTouchStart: this.props.onTouchStart,
        onSortableItemMount: this.props.onSortableItemMount,
        onSortableItemReadyToMove: this.props.onSortableItemReadyToMove,
        model: this.props.model,
        panel: this.props.panel,
        selectedTab: this.state.selectedTab,
        sortData: this.props.sortData,
        style: this.props.style,
        switchTab: this.switchTab,
        toggleVisible: this.toggleVisible,
        visible: this.state.visible
      };
      return (<Component {...params}/>);
    }
    return (<div>Missing Series component for panel type: {panel.type}</div>);
  }

}

Series.defaultProps = {
  name: 'metrics'
};

Series.propTypes = {
  className: PropTypes.string,
  colorPicker: PropTypes.bool,
  disableAdd: PropTypes.bool,
  disableDelete: PropTypes.bool,
  fields: PropTypes.object,
  name: PropTypes.string,
  onAdd: PropTypes.func,
  onChange: PropTypes.func,
  onClone: PropTypes.func,
  onDelete: PropTypes.func,
  onMouseDown: PropTypes.func,
  onSortableItemMount: PropTypes.func,
  onSortableItemReadyToMove: PropTypes.func,
  onTouchStart: PropTypes.func,
  model: PropTypes.object,
  panel: PropTypes.object,
  sortData: PropTypes.string,
};

export default sortable(Series);
