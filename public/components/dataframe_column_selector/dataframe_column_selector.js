import React from 'react';
import _ from 'lodash';
import Dataframe from 'plugins/rework/arg_types/dataframe/lib/dataframe';


export default React.createClass({
  select(e) {
    this.props.onChange(e.target.value);
  },
  render() {
    const {onChange, value, dataframe} = this.props;

    const maybeBlank = !dataframe.columns.named[value] ? '' : value;

    const options = _.map(dataframe.columns.named, (column, name) => (
      <option key={name} value={name}>{name} ({column.type})</option>
    ));
    return (
      <div className="rework--dataframe-column-selector">
        <select className="form-control" onChange={this.select} value={maybeBlank}>
          <option disabled value=''>--select--</option>
          {options}
        </select>
      </div>
    );
  }
});
