/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import { useGeneratedHtmlId } from '@elastic/eui';
import { getFilterableFields, GenericComboBox } from '../../filter_bar/filter_editor';

interface FieldInputProps {
  dataView: DataView;
  onHandleField: (field: DataViewField) => void;
  field?: DataViewField;
}

export function FieldInput({ field, dataView, onHandleField }: FieldInputProps) {
  const fields = dataView ? getFilterableFields(dataView) : [];
  const id = useGeneratedHtmlId({ prefix: 'fieldInput' });

  const onFieldChange = useCallback(
    ([selectedField]: DataViewField[]) => {
      onHandleField(selectedField);
    },
    [onHandleField]
  );

  const getLabel = useCallback((view: DataViewField) => view.customLabel || view.name, []);

  return (
    <GenericComboBox
      id={id}
      isDisabled={!dataView}
      placeholder={i18n.translate('unifiedSearch.filter.filtersBuilder.fieldSelectPlaceholder', {
        defaultMessage: 'Select a field',
      })}
      options={fields}
      selectedOptions={field ? [field] : []}
      getLabel={getLabel}
      onChange={onFieldChange}
      singleSelection={{ asPlainText: true }}
      isClearable={false}
      compressed
      fullWidth
      data-test-subj="filterFieldSuggestionList"
    />
  );
}
