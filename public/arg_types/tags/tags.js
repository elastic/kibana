import React from 'react';
import ArgType from 'plugins/rework/arg_types/arg_type';
import argTypes from 'plugins/rework/arg_types/arg_types';
import Select from 'react-select';
import 'react-select/dist/react-select.css';
import _ from 'lodash';
import './tags.less';

argTypes.push(new ArgType('tags', {
  default: '', // Wouldn't make sense to have a default, better set one in your arg
  form: ({commit, value, options}) => {
    const storeValue = (e) => commit(_.map(e, 'value'));

    const selectValues = _.map(value, item => {
      return {label: item, value: item};
    });

    return (
      <div className="rework--tags-select">
        <Select.Creatable
  				multi={true}
  				options={[]}
  				onChange={storeValue}
  				value={selectValues}
          clearable={false}
          placeholder={options.placeholder || 'Add ...'}
          noResultsText={'Type to add'}
  			/>
      </div>
    );

  },
  resolve: (value, state) => {
    return value;
  }
}));
