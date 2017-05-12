import React, { Component, PropTypes } from 'react';
import Select from 'react-select';

export class IndexPatternSelect extends Component {
  constructor(props) {
    super(props);

    this.loadOptions = this.loadOptions.bind(this);
  }

  loadOptions(input, callback) {
    this.props.getIndexPatternIds().then(ids => {
      this.cachedOptions = ids.map(id => {
        return { label: id, value: id };
      });
      //Setting complete=true means loadOptions will never be called again.
      callback(null, { options: this.cachedOptions, complete: true });
    });
  }

  render() {
    return (
      <Select.Async
        placeholder="Select..."
        value={this.props.value}
        loadOptions={this.loadOptions}
        onChange={this.props.onChange}/>
    );
  }
}

IndexPatternSelect.propTypes = {
  getIndexPatternIds: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
  value: PropTypes.string
};
