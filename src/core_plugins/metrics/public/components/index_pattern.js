import React, { PropTypes } from 'react';
import FieldSelect from './aggs/field_select';
import createSelectHandler from './lib/create_select_handler';
import createTextHandler from './lib/create_text_handler';
import YesNo from './yes_no';

export const IndexPattern = props => {
  const { fields, prefix } = props;
  const handleSelectChange = createSelectHandler(props.onChange);
  const handleTextChange = createTextHandler(props.onChange);
  const timeFieldName = `${prefix}time_field`;
  const indexPatternName = `${prefix}index_pattern`;
  const intervalName = `${prefix}interval`;
  const dropBucketName = `${prefix}drop_last_bucket`;

  const defaults = {
    [indexPatternName]: '*',
    [intervalName]: 'auto',
    [dropBucketName]: 1
  };

  const model = { ...defaults, ...props.model };
  return (
    <div className={props.className}>
      <div className="vis_editor__label">Index Pattern</div>
      <input
        className="vis_editor__input"
        disabled={props.disabled}
        onChange={handleTextChange(indexPatternName, '*')}
        value={model[indexPatternName]}
      />
      <div className="vis_editor__label">Time Field</div>
      <div className="vis_editor__index_pattern-fields">
        <FieldSelect
          restrict="date"
          value={model[timeFieldName]}
          disabled={props.disabled}
          onChange={handleSelectChange(timeFieldName)}
          indexPattern={model[indexPatternName]}
          fields={fields}
        />
      </div>
      <div className="vis_editor__label">Interval (auto, 1m, 1d, 1w, 1y)</div>
      <input
        className="vis_editor__input"
        disabled={props.disabled}
        onChange={handleTextChange(intervalName, 'auto')}
        value={model[intervalName]}
      />
      <div className="vis_editor__label">Drop Last Bucket</div>
      <YesNo
        value={model[dropBucketName]}
        name={dropBucketName}
        onChange={props.onChange}
      />
    </div>
  );
};

IndexPattern.defaultProps = {
  prefix: '',
  disabled: false,
  className: 'vis_editor__row'
};

IndexPattern.propTypes = {
  model: PropTypes.object.isRequired,
  fields: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  prefix: PropTypes.string,
  disabled: PropTypes.bool,
  className: PropTypes.string
};
