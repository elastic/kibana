import React from 'react';
import _ from 'lodash';
import Dataframe from 'plugins/rework/arg_types/dataframe/lib/dataframe';


export default class DataframeColumnSelector extends React.PureComponent {
  constructor(props) {    /* Note props is passed into the constructor in order to be used */
    super(props);
  }

  select(e) {
    this.props.onChange(e.target.value);
  }

  render() {
    const {onChange, value, dataframe} = this.props;

    const maybeBlank = !dataframe.columns.named[value] ? '' : value;

    const options = _.map(dataframe.columns.named, (column, name) => (
      <option key={name} value={name}>{name} ({column.type})</option>
    ));
    return (
      <div className="rework--dataframe-column-selector">
        <select className="form-control" onChange={this.select.bind(this)} value={maybeBlank}>
          <option disabled value=''>--select--</option>
          {options}
        </select>
      </div>
    );
  }
};
