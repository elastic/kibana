import React from 'react';
import _ from 'lodash';
import { connect } from 'react-redux';
import DataframeSelector from 'plugins/rework/components/dataframe_selector/dataframe_selector';
import Tooltip from 'plugins/rework/components/tooltip/tooltip';
import { dropdownOpen } from 'plugins/rework/state/actions/misc';
import './frame_link.less';

const LinkFrame = React.createClass({
  showEditDataframe() {
    this.props.dispatch(dropdownOpen('dataframe'));
  },

  showCreateDataframe() {
    this.props.dispatch(dropdownOpen('dataframe'));
  },

  render() {
    const {dataframes, select, value, types} = this.props;

    const showDataframes = !types ? dataframes : _.pickBy(dataframes, (dataframe, id) => {
      return _.includes(types, dataframe.type);
    });

    return (
      <div className="rework--frame-link">
        <DataframeSelector
          onChange={select}
          dataframes={showDataframes}
          selected={value}>
        </DataframeSelector>
        <div className="rework--frame-link--controls">
          <Tooltip content="Edit Dataframe">
            <a onClick={this.showEditDataframe} className="fa fa-pencil"></a>
          </Tooltip>
          <Tooltip content="New Dataframe">
            <a onClick={this.showCreateDataframe} className="fa fa-plus"></a>
          </Tooltip>
        </div>
      </div>
    );
  }
});

function mapStateToProps(state) {
  return {
    dataframes: state.persistent.dataframes
  };
}

export default connect(mapStateToProps)(LinkFrame);
