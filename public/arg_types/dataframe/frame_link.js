import React from 'react';
import _ from 'lodash';
import { connect } from 'react-redux';

const LinkFrame = React.createClass({
  render() {
    const {dataframes, select, value} = this.props;
    const options = _.map(dataframes, (value, key) => (
      <option key={key} value={key}>{value.name}</option>
    ));
    return (
      <select className="form-control" value={value} onChange={select}>
        {options}
      </select>
    );
  }
});

function mapStateToProps(state) {
  return {
    dataframes: state.persistent.dataframes
  };
}

export default connect(mapStateToProps)(LinkFrame);
