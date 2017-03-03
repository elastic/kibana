import React, { PropTypes } from 'react';
import Select from 'react-select';
function GroupBySelect(props) {
  const modeOptions = [
    { label: 'Everything', value: 'everything' },
    { label: 'Filter', value: 'filter' },
    { label: 'Filters', value: 'filters' },
    { label: 'Terms', value: 'terms' }
  ];
  return (
    <Select
      clearable={false}
      value={ props.value || 'everything' }
      onChange={props.onChange}
      options={ modeOptions }/>
  );

}

GroupBySelect.propTypes = {
  onChange: PropTypes.func,
  value: PropTypes.string
};

export default GroupBySelect;
