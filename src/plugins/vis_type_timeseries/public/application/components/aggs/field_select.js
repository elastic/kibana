/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import PropTypes from 'prop-types';
import React from 'react';
import { EuiComboBox } from '@elastic/eui';
import { injectI18n } from '@kbn/i18n/react';
import { isFieldEnabled } from '../../lib/check_ui_restrictions';
import { i18n } from '@kbn/i18n';

const isFieldTypeEnabled = (fieldRestrictions, fieldType) =>
  fieldRestrictions.length ? fieldRestrictions.includes(fieldType) : true;

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
  indexPattern: '',
  disabled: false,
  restrict: [],
  placeholder: i18n.translate('visTypeTimeseries.fieldSelect.selectFieldPlaceholder', {
    defaultMessage: 'Select field...',
  }),
};

FieldSelectUi.propTypes = {
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
