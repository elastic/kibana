import React from 'react';
import _ from 'lodash';
import { connect } from 'react-redux';
import DataframeSelector from 'plugins/rework/components/dataframe_selector/dataframe_selector';
import Tooltip from 'plugins/rework/components/tooltip/tooltip';
import { dropdownOpen } from 'plugins/rework/state/actions/misc';
import './frame_link.less';

class LinkFrame extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = {showDataframes: [], dataframeNames: []};
  }

  showEditDataframe() {
    this.props.dispatch(dropdownOpen({
      type: 'dataframe',
      meta: { selected: this.props.value },
    }));
  }

  showCreateDataframe() {
    this.props.dispatch(dropdownOpen({
      type: 'dataframe',
      meta: { creating: true },
    }));
  }

  filterDataframes() {
    const {dataframes, select, value, types} = this.props;

    const showDataframes = !types ? dataframes : _.pickBy(dataframes, (dataframe, id) => {
      return _.includes(types, dataframe.type);
    });

    const dataframeNames = _.keys(showDataframes);

    if (value && !_.includes(dataframeNames, value) && dataframeNames.length > 0) {
      select(dataframeNames[0]);
    }

    this.setState({showDataframes: showDataframes, dataframeNames: dataframeNames});
  }

  componentDidMount() {
    this.filterDataframes();
  }

  componentDidUpdate(nextProps) {
    if (!_.isEqual(nextProps.dataframes, this.props.dataframes)) {
      this.filterDataframes();
    }
  }

  render() {
    const {dataframes, select, value, types} = this.props;

    const {showDataframes, dataframeNames} = this.state;

    const noDataframes = dataframeNames.length ? null : (
      <small>
        <p>
          <i className="fa fa-info-circle"></i> It looks like you don't have any compatible dataframes.
          This source requires a dataframe from one of the following types: {(types || []).join(', ')}<br/>
          <a onClick={this.showCreateDataframe.bind(this)}>
          <i className="fa fa-plus-circle"></i> Create a compatible dataframe</a>
        </p>
      </small>
    );

    return (
      <div>
        <div className="rework--frame-link">
          <DataframeSelector
            onChange={select.bind(this)}
            dataframes={showDataframes}
            selected={value}>
          </DataframeSelector>
          <div className="rework--frame-link--controls">
            <Tooltip content="Edit Dataframe">
              <a onClick={this.showEditDataframe.bind(this)} className="fa fa-pencil"></a>
            </Tooltip>
            <Tooltip content="New Dataframe">
              <a onClick={this.showCreateDataframe.bind(this)} className="fa fa-plus"></a>
            </Tooltip>
          </div>
        </div>
        {noDataframes}
      </div>

    );
  }
};

function mapStateToProps(state) {
  return {
    dataframes: state.persistent.dataframes
  };
}

export default connect(mapStateToProps)(LinkFrame);
