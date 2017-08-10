import React, { Component, PropTypes } from 'react';
import { IndexPatternSelect } from './index_pattern_select';
import { FieldSelect } from './field_select';

export class TextControlEditor extends Component {
  constructor(props) {
    super(props);

  }

  filterField(field) {
    return ['ip', 'string'].includes(field.type);
  }

  render() {
    return (
      <div>

        <IndexPatternSelect
          value={this.props.controlParams.indexPattern}
          onChange={this.props.handleIndexPatternChange}
          getIndexPatterns={this.props.getIndexPatterns}
        />

        <FieldSelect
          value={this.props.controlParams.fieldName}
          indexPatternId={this.props.controlParams.indexPattern}
          filterField={this.filterField}
          onChange={this.props.handleFieldNameChange}
          getIndexPattern={this.props.getIndexPattern}
        />
      </div>
    );
  }
}

TextControlEditor.propTypes = {
  getIndexPatterns: PropTypes.func.isRequired,
  getIndexPattern: PropTypes.func.isRequired,
  controlParams: PropTypes.object.isRequired
};
