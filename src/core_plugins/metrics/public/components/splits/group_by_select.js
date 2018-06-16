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
import {
  EuiComboBox,
} from '@elastic/eui';
function GroupBySelect(props) {
  const modeOptions = [
    { label: 'Everything', value: 'everything' },
    { label: 'Filter', value: 'filter' },
    { label: 'Filters', value: 'filters' },
    { label: 'Terms', value: 'terms' }
  ];
  const selectedValue = props.value || 'everything';
  const selectedOption = modeOptions.find(option => {
    return selectedValue === option.value;
  });
  return (
    <EuiComboBox
      isClearable={false}
      options={modeOptions}
      selectedOptions={[selectedOption]}
      onChange={props.onChange}
      singleSelection={true}
    />
  );

}

GroupBySelect.propTypes = {
  onChange: PropTypes.func,
  value: PropTypes.string
};

export default GroupBySelect;
