/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiFormRow } from '@elastic/eui';
import { DataViewField } from '@kbn/data-views-plugin/common';
import { i18n } from '@kbn/i18n';
import { get } from 'lodash';
import { getOperatorOptions } from '../../../filter_bar/filter_editor/lib/filter_editor_utils';
import { Operator } from '../../../filter_bar/filter_editor/lib/filter_operators';
import { GenericComboBox } from '../../../filter_bar/filter_editor/generic_combo_box';

export function OperatorInput({
  field,
  operator,
  params,
  onHandleOperator,
}: {
  field: DataViewField | undefined;
  operator: Operator | undefined;
  params: any;
  onHandleOperator: (operator: Operator, params: any) => void;
}) {
  const operators = field ? getOperatorOptions(field) : [];

  function onOperatorChange([selectedOperator]: Operator[]) {
    const selectedParams =
      get(selectedOperator, 'type') === get(selectedOperator, 'type') ? params : undefined;

    onHandleOperator(selectedOperator, selectedParams);
  }

  return (
    <EuiFormRow fullWidth>
      <GenericComboBox
        fullWidth
        compressed
        isDisabled={!field}
        placeholder={
          field
            ? i18n.translate('unifiedSearch.filter.filterEditor.operatorSelectPlaceholderSelect', {
                defaultMessage: 'Select',
              })
            : i18n.translate('unifiedSearch.filter.filterEditor.operatorSelectPlaceholderWaiting', {
                defaultMessage: 'Waiting',
              })
        }
        options={operators}
        selectedOptions={operator ? [operator] : []}
        getLabel={({ message }) => message}
        onChange={onOperatorChange}
        singleSelection={{ asPlainText: true }}
        isClearable={false}
      />
    </EuiFormRow>
  );
}
