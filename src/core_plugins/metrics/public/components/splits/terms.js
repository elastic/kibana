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
import GroupBySelect from './group_by_select';
import createTextHandler from '../lib/create_text_handler';
import createSelectHandler from '../lib/create_select_handler';
import FieldSelect from '../aggs/field_select';
import MetricSelect from '../aggs/metric_select';
import { EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiFieldNumber, EuiComboBox, EuiSpacer } from '@elastic/eui';

export const SplitByTerms = props => {
  const handleTextChange = createTextHandler(props.onChange);
  const handleSelectChange = createSelectHandler(props.onChange);
  const { indexPattern } = props;
  const defaults = { terms_direction: 'desc', terms_size: 10, terms_order_by: '_count' };
  const model = { ...defaults, ...props.model };
  const { metrics } = model;
  const defaultCount = { value: '_count', label: 'Doc Count (default)' };
  const terms = { value: '_term', label: 'Terms' };

  const dirOptions = [
    { value: 'desc', label: 'Descending' },
    { value: 'asc', label: 'Ascending' },
  ];
  const selectedDirectionOption = dirOptions.find(option => {
    return model.terms_direction === option.value;
  });

  return (
    <div>
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem>
          <EuiFormRow label="Group by">
            <GroupBySelect
              value={model.split_mode}
              onChange={handleSelectChange('split_mode')}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow label="By">
            <FieldSelect
              indexPattern={indexPattern}
              onChange={handleSelectChange('terms_field')}
              value={model.terms_field}
              fields={props.fields}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer />

      <EuiFlexGroup alignItems="center">
        <EuiFlexItem>
          <EuiFormRow label="Top">
            <EuiFieldNumber
              placeholder="Size"
              value={Number(model.terms_size)}
              onChange={handleTextChange('terms_size')}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow label="Order by">
            <MetricSelect
              metrics={metrics}
              clearable={false}
              additionalOptions={[defaultCount, terms]}
              onChange={handleSelectChange('terms_order_by')}
              restrict="basic"
              value={model.terms_order_by}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow label="Direction">
            <EuiComboBox
              isClearable={false}
              options={dirOptions}
              selectedOptions={selectedDirectionOption ? [selectedDirectionOption] : []}
              onChange={handleSelectChange('terms_direction')}
              singleSelection={true}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};

SplitByTerms.propTypes = {
  model: PropTypes.object,
  onChange: PropTypes.func,
  indexPattern: PropTypes.string,
  fields: PropTypes.object
};
