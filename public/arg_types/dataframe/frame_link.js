import React from 'react';
import _ from 'lodash';
import { connect } from 'react-redux';
import DataframeSelector from 'plugins/rework/components/dataframe_selector/dataframe_selector';
import Tooltip from 'plugins/rework/components/tooltip/tooltip';
import { dropdownOpen } from 'plugins/rework/state/actions/misc';
import './frame_link.less';

const LinkFrame = React.createClass({
  showEditDataframe() {
    this.props.dispatch(dropdownOpen({
      type: 'dataframe',
      meta: null,
    }));
  },

  render() {
    const {dataframes, select, value} = this.props;
    return (
      <div className="rework--frame-link">
        <DataframeSelector
          onChange={select}
          dataframes={dataframes}
          selected={value}>
        </DataframeSelector>
        <div className="rework--frame-link--edit">
          <Tooltip content="Edit Dataframe">
            <a onClick={this.showEditDataframe} className="fa fa-pencil"></a>
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
