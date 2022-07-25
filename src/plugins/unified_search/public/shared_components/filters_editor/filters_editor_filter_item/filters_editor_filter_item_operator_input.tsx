/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback } from 'react';
import { DataViewField } from '@kbn/data-views-plugin/common';
import { Filter } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
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
  params: Filter['meta']['params'];
  onHandleOperator: (operator: Operator, params: Filter['meta']['params']) => void;
}) {
  const operators = field ? getOperatorOptions(field) : [];

  const onOperatorChange = useCallback(
    ([selectedOperator]: Operator[]) => {
      const selectedParams = selectedOperator?.type === operator?.type ? params : undefined;

      onHandleOperator(selectedOperator, selectedParams);
    },
    [onHandleOperator, operator?.type, params]
  );

  return (
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
  );
}
