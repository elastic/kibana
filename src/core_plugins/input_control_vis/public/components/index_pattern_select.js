import React, { Component, PropTypes } from 'react';
import Select from 'react-select';

export class IndexPatternSelect extends Component {
  constructor(props) {
    super(props);

    this.loadOptions = this.loadOptions.bind(this);
  }

  loadOptions(input, callback) {
    this.props.getIndexPatterns().then((indexPatternSavedObjects) => {
      const options = indexPatternSavedObjects.map((indexPatternSavedObject) => {
        return {
          label: indexPatternSavedObject.attributes.title,
          value: indexPatternSavedObject.id
        };
      });
      //Setting complete=true means loadOptions will never be called again.
      callback(null, { options: options, complete: true });
    });
  }

  render() {
    return (
      <div className="kuiSideBarFormRow">
        <label className="kuiSideBarFormRow__label">
          Index Pattern
        </label>
        <div className="kuiSideBarFormRow__control kuiFieldGroupSection--wide">
          <Select.Async
            className="index-pattern-react-select"
            placeholder="Select index pattern..."
            value={this.props.value}
            loadOptions={this.loadOptions}
            onChange={this.props.onChange}
            resetValue={''}
          />
        </div>
      </div>
    );
  }
}

IndexPatternSelect.propTypes = {
  getIndexPatterns: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
  value: PropTypes.string
};
