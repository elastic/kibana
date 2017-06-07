import React, { Component, PropTypes } from 'react';
import Select from 'react-select';

export class IndexPatternSelect extends Component {
  constructor(props) {
    super(props);

    this.loadOptions = this.loadOptions.bind(this);
  }

  loadOptions(input, callback) {
    this.props.getIndexPatternIds().then(ids => {
      const options = ids.map(id => {
        return { label: id, value: id };
      });
      //Setting complete=true means loadOptions will never be called again.
      callback(null, { options: options, complete: true });
    });
  }

  render() {
    return (
      <div className="kuiFieldGroup">
        <div className="kuiFieldGroupSection">
          <label>
            Index Pattern
          </label>
        </div>
        <div className="kuiFieldGroupSection kuiFieldGroupSection--wide">
          <Select.Async
            placeholder="Select..."
            value={this.props.value}
            loadOptions={this.loadOptions}
            onChange={this.props.onChange}
            resetValue={''}/>
        </div>
      </div>
    );
  }
}

IndexPatternSelect.propTypes = {
  getIndexPatternIds: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
  value: PropTypes.string
};
