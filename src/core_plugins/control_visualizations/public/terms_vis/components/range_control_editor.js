import React, { Component, PropTypes } from 'react';
import { IndexPatternSelect } from './index_pattern_select';
import { FieldSelect } from './field_select';

export class RangeControlEditor extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <div>
        <span>Range Control Editor</span>
        <IndexPatternSelect
          value={this.props.controlParams.indexPattern}
          onChange={this.props.handleIndexPatternChange}
          getIndexPatterns={this.props.getIndexPatterns}
        />

        <FieldSelect
          value={this.props.controlParams.fieldName}
          indexPatternId={this.props.controlParams.indexPattern}
          fieldTypes={['number']}
          onChange={this.props.handleFieldNameChange}
          getIndexPattern={this.props.getIndexPattern}
        />
      </div>
    );
  }
}

RangeControlEditor.propTypes = {
  getIndexPatterns: PropTypes.func.isRequired,
  getIndexPattern: PropTypes.func.isRequired,
  controlParams: PropTypes.object.isRequired
};
