/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiFormRow } from '@elastic/eui';
import type { Query } from '@kbn/data-plugin/common';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useExistingFieldsReader } from '@kbn/unified-field-list-plugin/public';
import {
  FieldOption,
  FieldOptionValue,
  FieldPicker,
  FilterQueryInput,
  type QueryInputServices,
} from '@kbn/visualization-ui-components/public';
import type { DataView } from '@kbn/data-views-plugin/common';
import { isFieldLensCompatible } from '@kbn/visualization-ui-components/public';
import type { QueryPointEventAnnotationConfig } from '../../../common';

export const defaultQuery: Query = {
  query: '',
  language: 'kuery',
};

export const ConfigPanelQueryAnnotation = ({
  annotation,
  dataView,
  onChange,
  queryInputShouldOpen,
  queryInputServices,
}: {
  annotation?: QueryPointEventAnnotationConfig;
  onChange: (annotations: Partial<QueryPointEventAnnotationConfig> | undefined) => void;
  dataView: DataView;
  queryInputShouldOpen?: boolean;
  queryInputServices: QueryInputServices;
}) => {
  const { hasFieldData } = useExistingFieldsReader();
  // list only date fields
  const options = dataView.fields
    .filter(isFieldLensCompatible)
    .filter((field) => field.type === 'date' && field.displayName)
    .map((field) => {
      return {
        label: field.displayName,
        value: {
          type: 'field',
          field: field.name,
          dataType: field.type,
        },
        exists: dataView.id ? hasFieldData(dataView.id, field.name) : false,
        compatible: true,
        'data-test-subj': `lns-fieldOption-${field.name}`,
      } as FieldOption<FieldOptionValue>;
    });

  const selectedField = annotation?.timeField || dataView.timeFieldName || options[0]?.value.field;
  const fieldIsValid = selectedField ? Boolean(dataView.getFieldByName(selectedField)) : true;

  return (
    <>
      <EuiFormRow
        hasChildLabel
        display="rowCompressed"
        className="lnsRowCompressedMargin"
        fullWidth
        label={i18n.translate('eventAnnotation.xyChart.annotation.queryInput', {
          defaultMessage: 'Annotation query',
        })}
        data-test-subj="annotation-query-based-query-input"
      >
        <FilterQueryInput
          initiallyOpen={queryInputShouldOpen}
          label=""
          inputFilter={annotation?.filter ?? defaultQuery}
          onChange={(query: Query) => {
            onChange({ filter: { type: 'kibana_query', ...query } });
          }}
          dataView={dataView}
          appName="TODO"
          queryInputServices={queryInputServices}
        />
      </EuiFormRow>

      <EuiFormRow
        display="rowCompressed"
        fullWidth
        label={i18n.translate('eventAnnotation.xyChart.annotation.queryField', {
          defaultMessage: 'Target date field',
        })}
      >
        <FieldPicker
          options={options}
          selectedOptions={
            selectedField
              ? [
                  {
                    label: selectedField,
                    value: { type: 'field', field: selectedField },
                  },
                ]
              : []
          }
          onChoose={function (choice: FieldOptionValue | undefined): void {
            if (choice) {
              onChange({ timeField: choice.field });
            }
          }}
          fieldIsInvalid={!fieldIsValid}
          data-test-subj="lnsXY-annotation-query-based-field-picker"
        />
      </EuiFormRow>
    </>
  );
};
