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
import { EuiComboBox } from '@elastic/eui';
import { injectI18n } from '@kbn/i18n/react';
import { isFieldEnabled } from '../../lib/check_ui_restrictions';
import { i18n } from '@kbn/i18n';
import { SCRIPTED_FIELD_VALUE } from '../../../../common/constants';

const isFieldTypeEnabled = (fieldRestrictions, fieldType) =>
  fieldRestrictions.length ? fieldRestrictions.includes(fieldType) : true;

const SCRIPT_OPTION = {
  label: i18n.translate('visTypeTimeseries.fieldSelect.scriptLabel', { defaultMessage: 'Script' }),
  value: SCRIPTED_FIELD_VALUE,
};

function FieldSelectUi({
  type,
  fields,
  indexPattern,
  value,
  onChange,
  disabled,
  restrict,
  placeholder,
  uiRestrictions,
  includeScript,
  ...rest
}) {
  if (type === 'count') {
    return null;
  }

  const selectedOptions = [];
  const options = Object.values(
    (fields[indexPattern] || []).reduce((acc, field) => {
      if (
        isFieldTypeEnabled(restrict, field.type) &&
        isFieldEnabled(field.name, type, uiRestrictions)
      ) {
        const item = {
          label: field.name,
          value: field.name,
        };

        if (acc[field.type]) {
          acc[field.type].options.push(item);
        } else {
          acc[field.type] = {
            options: [item],
            label: field.type,
          };
        }

        if (value === item.value) {
          selectedOptions.push(item);
        }
      }

      return acc;
    }, {})
  );

  if (includeScript) {
    options.unshift({ options: [SCRIPT_OPTION], label: 'special ' });
  }

  if (onChange && value === SCRIPTED_FIELD_VALUE && !selectedOptions.length) {
    selectedOptions.push(SCRIPT_OPTION);
  }

  if (onChange && value && !selectedOptions.length) {
    onChange();
  }

  return (
    <EuiComboBox
      placeholder={placeholder}
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
  includeScript: false,
  indexPattern: '*',
  disabled: false,
  restrict: [],
  placeholder: i18n.translate('visTypeTimeseries.fieldSelect.selectFieldPlaceholder', {
    defaultMessage: 'Select field...',
  }),
};

FieldSelectUi.propTypes = {
  includeScript: PropTypes.bool,
  disabled: PropTypes.bool,
  fields: PropTypes.object,
  id: PropTypes.string,
  indexPattern: PropTypes.string,
  onChange: PropTypes.func,
  restrict: PropTypes.array,
  type: PropTypes.string,
  value: PropTypes.string,
  uiRestrictions: PropTypes.object,
  placeholder: PropTypes.string,
};

export const FieldSelect = injectI18n(FieldSelectUi);
