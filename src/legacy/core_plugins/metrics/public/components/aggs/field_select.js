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
import generateByTypeFilter from '../lib/generate_by_type_filter';
import { injectI18n } from '@kbn/i18n/react';
import { isFieldEnabled } from '../../lib/check_ui_restrictions';

function FieldSelectUi({
  type,
  fields,
  indexPattern,
  value,
  onChange,
  disabled,
  restrict,
  intl,
  uiRestrictions,
  ...rest
}) {

  if (type === 'count') {
    return null;
  }

  const typeFilter = generateByTypeFilter(restrict);
  const options = (fields[indexPattern] || [])
    .filter(field => typeFilter(field) && isFieldEnabled(field.name, type, uiRestrictions))
    .map(field => ({ label: field.name, value: field.name }));

  const selectedOption = options.find(option => value === option.value);
  const selectedOptions = selectedOption ? [selectedOption] : [];

  return (
    <EuiComboBox
      placeholder={intl.formatMessage({
        id: 'tsvb.fieldSelect.selectFieldPlaceholder',
        defaultMessage: 'Select field...',
      })}
      isDisabled={disabled}
      options={options}
      selectedOptions={selectedOptions}
      onChange={onChange}
      singleSelection={{ asPlainText: true }}
      {...rest}
    />
  );
}

FieldSelectUi.defaultProps = {
  indexPattern: '*',
  disabled: false,
  restrict: 'none',
};

FieldSelectUi.propTypes = {
  disabled: PropTypes.bool,
  fields: PropTypes.object,
  id: PropTypes.string,
  indexPattern: PropTypes.string,
  onChange: PropTypes.func,
  restrict: PropTypes.string,
  type: PropTypes.string,
  value: PropTypes.string,
  uiRestrictions: PropTypes.object,
};

const FieldSelect = injectI18n(FieldSelectUi);
export default FieldSelect;
