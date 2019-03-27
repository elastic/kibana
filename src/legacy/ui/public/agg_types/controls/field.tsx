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

import { isFunction } from 'lodash';
import React, { useEffect } from 'react';

import { EuiCallOut, EuiComboBox, EuiComboBoxOptionProps, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { get } from 'lodash';
import { AggConfig } from 'ui/vis';
import { formatListAsProse, parseCommaSeparatedList } from '../../../../utils';
import { AggParamRequiredEditorProps } from '../../vis/editors/default';
import { ComboBoxGroupedOption } from '../../vis/editors/default/default_editor_utils';
import { FieldParamType } from '../param_types';

function FieldParamEditor({
  agg = {},
  indexedFields = [],
  aggParam,
  value,
  setValue,
  isInvalid,
  setValidity,
  setTouched,
}: AggParamRequiredEditorProps<FieldParamType>) {
  const label = i18n.translate('common.ui.aggTypes.field.fieldLabel', { defaultMessage: 'Field' });
  const selectedOptions: ComboBoxGroupedOption[] = value
    ? [{ label: value.displayName, value }]
    : [];

  const onChange = (options: EuiComboBoxOptionProps[]) => {
    setValue(get(options, '0.value'));

    if (isFunction(aggParam.onChange)) {
      aggParam.onChange(agg);
    }
  };

  useEffect(
    () => {
      setValidity(!!value);
    },
    [value]
  );

  return (
    <EuiFormRow
      label={label}
      isInvalid={isInvalid}
      fullWidth={true}
      className="visEditorSidebar__aggParamFormRow"
    >
      {indexedFields.length ? (
        <EuiComboBox
          placeholder={i18n.translate('common.ui.aggTypes.field.selectFieldPlaceholder', {
            defaultMessage: 'Select a field…',
          })}
          options={indexedFields}
          selectedOptions={selectedOptions}
          singleSelection={{ asPlainText: true }}
          isClearable={false}
          isInvalid={isInvalid}
          onChange={onChange}
          data-test-subj="visDefaultEditorField"
          fullWidth={true}
          onBlur={setTouched}
        />
      ) : (
        <EuiCallOut
          title={i18n.translate('common.ui.aggTypes.dateRanges.noCompatibleFieldsLabel', {
            defaultMessage: 'No compatible fields:',
          })}
          color="danger"
          iconType="alert"
        >
          <p>
            <FormattedMessage
              id="common.ui.aggTypes.dateRanges.noCompatibleFieldsDescription"
              defaultMessage="The {indexPatternTitle} index pattern does not contain any of the following field types:"
              values={{ indexPatternTitle: agg.getIndexPattern && agg.getIndexPattern().title }}
            />{' '}
            {getFieldTypesString(agg)}
          </p>
        </EuiCallOut>
      )}
    </EuiFormRow>
  );
}

function getFieldTypesString(agg: AggConfig) {
  return formatListAsProse(
    parseCommaSeparatedList(get(agg, 'type.params.byName.field.filterFieldTypes')),
    { inclusive: false }
  );
}

export { FieldParamEditor };
