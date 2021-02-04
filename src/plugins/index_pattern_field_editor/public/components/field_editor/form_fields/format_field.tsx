/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useState, useEffect } from 'react';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';

import { UseField, useFormData, ES_FIELD_TYPES, useFormContext } from '../../../shared_imports';
import { FormatSelectEditor, FormatSelectEditorProps } from '../../field_format_editor';
import { castEsToKbnFieldTypeName } from '../../../../../data/public';
import { FieldFormInternal } from '../field_editor';
import { FieldFormatConfig } from '../../../types';

export const FormatField = ({
  indexPattern,
  fieldFormatEditors,
  fieldFormats,
  uiSettings,
}: Omit<FormatSelectEditorProps, 'onChange' | 'onError' | 'fieldAttrs'>) => {
  const [{ name, type }] = useFormData<FieldFormInternal>({ watch: ['name', 'type'] });
  const typeValue = type && type[0] ? type[0].value : undefined;
  const { getFields, isSubmitted } = useFormContext();
  const [formatError, setFormatError] = useState<string | undefined>();

  useEffect(() => {
    if (formatError === undefined) {
      getFields().format.setErrors([]);
    } else {
      getFields().format.setErrors([{ message: formatError }]);
    }
  }, [formatError, getFields]);

  useEffect(() => {
    getFields().format.reset();
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
              fieldAttrs={{
                name,
                type: castEsToKbnFieldTypeName(typeValue || 'keyword'),
                esTypes: typeValue
                  ? ([typeValue] as ES_FIELD_TYPES[])
                  : (['keyword'] as ES_FIELD_TYPES[]),
              }}
              indexPattern={indexPattern}
              fieldFormatEditors={fieldFormatEditors}
              fieldFormats={fieldFormats}
              uiSettings={uiSettings}
              onChange={setValue}
              onError={setFormatError}
              value={value}
              key={typeValue}
            />
          </>
        );
      }}
    </UseField>
  );
};
