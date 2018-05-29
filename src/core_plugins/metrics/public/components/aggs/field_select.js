/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import PropTypes from 'prop-types';
import React from 'react';
import Select from 'react-select';
import generateByTypeFilter from '../lib/generate_by_type_filter';

function FieldSelect(props) {
  const { type, fields, indexPattern } = props;
  if (type === 'count') {
    return null;
  }
  const options = (fields[indexPattern] || [])
    .filter(generateByTypeFilter(props.restrict))
    .map(field => {
      return { label: field.name, value: field.name };
    });

  return (
    <Select
      inputProps={{ id: props.id }}
      placeholder="Select field..."
      disabled={props.disabled}
      options={options}
      value={props.value}
      onChange={props.onChange}
    />
  );
}

FieldSelect.defaultProps = {
  indexPattern: '*',
  disabled: false,
  restrict: 'none'
};

FieldSelect.propTypes = {
  disabled: PropTypes.bool,
  fields: PropTypes.object,
  id: PropTypes.string,
  indexPattern: PropTypes.string,
  onChange: PropTypes.func,
  restrict: PropTypes.string,
  type: PropTypes.string,
  value: PropTypes.string
};

export default FieldSelect;
