import PropTypes from 'prop-types';
import React, { Component } from 'react';
import Select from 'react-select';

import {
  EuiFormRow,
} from '@elastic/eui';

export class IndexPatternSelect extends Component {
  constructor(props) {
    super(props);

    this.loadOptions = this.loadOptions.bind(this);
  }

  loadOptions(input, callback) {
    this.props.getIndexPatterns(input).then((indexPatternSavedObjects) => {
      const options = indexPatternSavedObjects.map((indexPatternSavedObject) => {
        return {
          label: indexPatternSavedObject.attributes.title,
          value: indexPatternSavedObject.id
        };
      });
      callback(null, { options: options });
    });
  }

  render() {
    const selectId = `indexPatternSelect-${this.props.controlIndex}`;
    return (
      <EuiFormRow
        id={selectId}
        label="Index Pattern"
      >
        <Select.Async
          className="index-pattern-react-select"
          placeholder="Select index pattern..."
          value={this.props.value}
          loadOptions={this.loadOptions}
          onChange={this.props.onChange}
          resetValue={''}
          inputProps={{ id: selectId }}
        />
      </EuiFormRow>
    );
  }
}

IndexPatternSelect.propTypes = {
  getIndexPatterns: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
  value: PropTypes.string,
  controlIndex: PropTypes.number.isRequired,
};
