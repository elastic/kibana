import React from 'react';
import _ from 'lodash';

export default React.createClass({
  select(e) {
    this.props.onChange(e.target.value);
  },
  render() {
    const {onChange, dataframes, selected} = this.props;
    const options = _.map(dataframes, (dataframe, id) => (
      <option key={id} value={id}>{dataframe.name} ({dataframe.type})</option>
    ));

    return (
      <div className="rework--dataframe-selector">
        <select className="form-control" onChange={this.select} value={selected}>
          {options}
        </select>
      </div>
    );
  }
});
