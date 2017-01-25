import React, { Component, PropTypes } from 'react';
import _ from 'lodash';
import FieldSelect from './aggs/field_select';
import createSelectHandler from './lib/create_select_handler';
import createTextHandler from './lib/create_text_handler';

class IndexPattern extends Component {
  render() {
    const { model, fields, prefix } = this.props;
    const handleSelectChange = createSelectHandler(this.props.onChange);
    const handleTextChange = createTextHandler(this.props.onChange, this.refs);
    const timeFieldName = `${prefix}time_field`;
    const indexPatternName = `${prefix}index_pattern`;
    const intervalName = `${prefix}interval`;
    return (
      <div className={this.props.className}>
        <div className="vis_editor__label">Index Pattern</div>
        <input
          className="vis_editor__input"
          ref={indexPatternName}
          disabled={this.props.disabled}
          onChange={handleTextChange(indexPatternName, '*')}
          defaultValue={model[indexPatternName] || '*'}/>
        <div className="vis_editor__label">Time Field</div>
        <div className="vis_editor__index_pattern-fields">
          <FieldSelect
            restrict="date"
            value={model[timeFieldName]}
            disabled={this.props.disabled}
            onChange={handleSelectChange(timeFieldName)}
            indexPattern={model[indexPatternName]}
            fields={fields}/>
        </div>
        <div className="vis_editor__label">Interval (auto, 1m, 1d, 1w, 1y)</div>
        <input
          className="vis_editor__input"
          ref={intervalName}
          disabled={this.props.disabled}
          onChange={handleTextChange(intervalName, 'auto')}
          defaultValue={model[intervalName] || 'auto'}/>
      </div>
    );
  }
}

IndexPattern.defaultProps = {
  prefix    : '',
  disabled  : false,
  className : 'vis_editor__row'
};

IndexPattern.propTypes = {
  model     : PropTypes.object.isRequired,
  fields    : PropTypes.object.isRequired,
  onChange  : PropTypes.func.isRequired,
  prefix    : PropTypes.string,
  disabled  : PropTypes.bool,
  className : PropTypes.string
};

export default IndexPattern;
