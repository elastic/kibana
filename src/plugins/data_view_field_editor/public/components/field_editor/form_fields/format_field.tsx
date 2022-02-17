/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useState, useEffect, useRef } from 'react';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';

import { UseField, useFormData, ES_FIELD_TYPES, useFormContext } from '../../../shared_imports';
import { useFieldEditorContext } from '../../field_editor_context';
import { FormatSelectEditor } from '../../field_format_editor';
import type { FieldFormInternal } from '../field_editor';
import type { FieldFormatConfig } from '../../../types';

export const FormatField = () => {
  const { dataView, uiSettings, fieldFormats, fieldFormatEditors } = useFieldEditorContext();
  const isMounted = useRef(false);
  const [{ type }] = useFormData<FieldFormInternal>({ watch: ['name', 'type'] });
  const { getFields, isSubmitted } = useFormContext();
  const [formatError, setFormatError] = useState<string | undefined>();
  // convert from combobox type to values
  const typeValue = type.reduce((collector, item) => {
    if (item.value !== undefined) {
      collector.push(item.value as ES_FIELD_TYPES);
    }
    return collector;
  }, [] as ES_FIELD_TYPES[]);

  useEffect(() => {
    if (formatError === undefined) {
      getFields().format.setErrors([]);
    } else {
      getFields().format.setErrors([{ message: formatError }]);
    }
  }, [formatError, getFields]);

  useEffect(() => {
    if (isMounted.current) {
      getFields().format.reset();
    }
    isMounted.current = true;
  }, [type, getFields]);

  return (
    <UseField<FieldFormatConfig | undefined> path="format">
      {({ setValue, errors, value }) => {
        return (
          <>
            {isSubmitted && errors.length > 0 && (
              <>
                <EuiCallOut
                  title={errors.map((err) => err.message)}
                  color="danger"
                  iconType="cross"
                  data-test-subj="formFormatError"
                />
                <EuiSpacer size="m" />
              </>
            )}

            <FormatSelectEditor
              esTypes={typeValue || (['keyword'] as ES_FIELD_TYPES[])}
              indexPattern={dataView}
              fieldFormatEditors={fieldFormatEditors}
              fieldFormats={fieldFormats}
              uiSettings={uiSettings}
              onChange={setValue}
              onError={setFormatError}
              value={value}
              key={typeValue.join(', ')}
            />
          </>
        );
      }}
    </UseField>
  );
};
