/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback } from 'react';
import { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import { i18n } from '@kbn/i18n';
import { GenericComboBox } from '../../../filter_bar/filter_editor/generic_combo_box';
import { getFilterableFields } from '../../../filter_bar/filter_editor/lib/filter_editor_utils';

export function FieldInput({
  field,
  dataView,
  onHandleField,
}: {
  field: DataViewField | undefined;
  dataView: DataView;
  onHandleField: (field: DataViewField) => void;
}) {
  const fields = dataView ? getFilterableFields(dataView) : [];

  const onFieldChange = useCallback(
    ([selectedfield]: DataViewField[]) => {
      onHandleField(selectedfield);
    },
    [onHandleField]
  );

  return (
    <GenericComboBox
      fullWidth
      compressed
      id="fieldInput"
      isDisabled={!dataView}
      placeholder={i18n.translate('unifiedSearch.filter.filterEditor.fieldSelectPlaceholder', {
        defaultMessage: 'Select a field first',
      })}
      options={fields}
      selectedOptions={field ? [field] : []}
      getLabel={(view: DataViewField) => view.customLabel || view.name}
      onChange={onFieldChange}
      singleSelection={{ asPlainText: true }}
      isClearable={false}
    />
  );
}
