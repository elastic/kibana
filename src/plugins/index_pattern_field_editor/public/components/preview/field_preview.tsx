/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useState, useCallback, useMemo } from 'react';
import { get } from 'lodash';
import { i18n } from '@kbn/i18n';
import { EuiSpacer, EuiResizeObserver, EuiButtonEmpty } from '@elastic/eui';

import { useFieldEditorContext } from '../field_editor_context';
import { useFieldPreviewContext } from './field_preview_context';
import { FieldPreviewHeader } from './field_preview_header';
import { FieldPreviewEmptyPrompt } from './field_preview_empty_prompt';
import { PreviewDocumentsNav } from './preview_documents_nav';
import { FieldPreviewError } from './field_preview_error';
import { PreviewFieldList, Field, ITEM_HEIGHT } from './field_list/field_list';

const INITIAL_MAX_NUMBER_OF_FIELDS = 7;

export const FieldPreview = () => {
  const { indexPattern } = useFieldEditorContext();

  const [fieldListHeight, setFieldListHeight] = useState(-1);
  const [showAllFields, setShowAllFields] = useState(false);

  const {
    params: {
      value: { name, script, format },
    },
    currentDocument: { value: currentDocument },
    error,
  } = useFieldPreviewContext();

  const {
    fields: { getAll: getAllFields },
  } = indexPattern;

  // To show the preview we at least need a name to be defined and the script or the format
  const isEmptyPromptVisible = name === null || (script !== null && format !== null);

  const fields = useMemo(() => {
    return getAllFields();
  }, [getAllFields]);

  const fieldsValues: Field[] = useMemo(
    () =>
      fields
        .map((field) => ({
          key: field.displayName,
          value: JSON.stringify(get(currentDocument?._source, field.name)),
        }))
        .filter(({ value }) => value !== undefined),
    [fields, currentDocument?._source]
  );

  const filteredFields = useMemo(
    () =>
      showAllFields
        ? fieldsValues
        : fieldsValues.filter((_, i) => i < INITIAL_MAX_NUMBER_OF_FIELDS),
    [fieldsValues, showAllFields]
  );

  const onFieldListResize = useCallback(({ height }: { height: number }) => {
    setFieldListHeight(height);
  }, []);

  const toggleShowAllFields = useCallback(() => {
    setShowAllFields((prev) => !prev);
  }, []);

  const renderToggleFieldsButton = () => (
    <EuiButtonEmpty onClick={toggleShowAllFields} flush="left">
      {showAllFields
        ? i18n.translate('indexPatternFieldEditor.fieldPreview.showLessFieldsButtonLabel', {
            defaultMessage: 'Show less',
          })
        : i18n.translate('indexPatternFieldEditor.fieldPreview.showMoreFieldsButtonLabel', {
            defaultMessage: 'Show more',
          })}
    </EuiButtonEmpty>
  );

  return (
    <>
      {isEmptyPromptVisible ? (
        <FieldPreviewEmptyPrompt />
      ) : (
        <>
          <FieldPreviewHeader />
          <EuiSpacer />

          <PreviewDocumentsNav />
          <EuiSpacer />

          {error === null ? (
            filteredFields.length > 0 && (
              <>
                <EuiResizeObserver onResize={onFieldListResize}>
                  {(resizeRef) => (
                    <div
                      ref={resizeRef}
                      style={{
                        flex: 1,
                        flexGrow: showAllFields ? 1 : 0,
                        minHeight: showAllFields
                          ? undefined
                          : `${ITEM_HEIGHT * filteredFields.length}px`,
                      }}
                    >
                      <PreviewFieldList height={fieldListHeight} fields={filteredFields} />
                    </div>
                  )}
                </EuiResizeObserver>
                <div>{renderToggleFieldsButton()}</div>
              </>
            )
          ) : (
            <FieldPreviewError />
          )}
        </>
      )}
    </>
  );
};
