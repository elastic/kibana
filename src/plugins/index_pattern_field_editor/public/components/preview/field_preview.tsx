/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useState, useCallback, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiSpacer, EuiResizeObserver, EuiFieldSearch } from '@elastic/eui';

import { useFieldPreviewContext } from './field_preview_context';
import { FieldPreviewHeader } from './field_preview_header';
import { FieldPreviewEmptyPrompt } from './field_preview_empty_prompt';
import { DocumentsNavPreview } from './documents_nav_preview';
import { FieldPreviewError } from './field_preview_error';
import { PreviewListItem } from './field_list/field_list_item';
import { PreviewFieldList } from './field_list/field_list';

import './field_preview.scss';

const i18nTexts = {
  a11y: {
    label: i18n.translate('indexPatternFieldEditor.fieldPreview.panelLabel', {
      defaultMessage: 'Field preview',
    }),
    description: i18n.translate('indexPatternFieldEditor.fieldPreview.panelDescription', {
      defaultMessage:
        'Preview how the field will be rendered. Its format if one has been provided or the value returned by the painless script for runtime fields.',
    }),
  },
};

export const FieldPreview = () => {
  const [fieldListHeight, setFieldListHeight] = useState(-1);
  const [searchValue, setSearchValue] = useState('');

  const {
    params: {
      value: { name, script, format },
    },
    fields,
    error,
    reset,
  } = useFieldPreviewContext();

  // To show the preview we at least need a name to be defined, the script or the format
  // and an first response from the _execute API
  const isEmptyPromptVisible =
    name === null && script === null && format === null
      ? true
      : // If we have some result from the _execute API call don't show the empty prompt
      error !== null || fields.length > 0
      ? false
      : name === null && format === null
      ? true
      : false;

  const onFieldListResize = useCallback(({ height }: { height: number }) => {
    setFieldListHeight(height);
  }, []);

  const renderFieldsToPreview = () => {
    if (fields.length === 0) {
      return null;
    }

    const [field] = fields;

    return (
      <ul tabIndex={0}>
        <li data-test-subj="fieldPreviewItem">
          <PreviewListItem field={field} highlighted />
        </li>
      </ul>
    );
  };

  useEffect(() => {
    // When unmounting the preview pannel we make sure to reset
    // the state of the preview panel.
    return reset;
  }, [reset]);

  return (
    <div
      className="indexPatternFieldEditor__previewPannel"
      tabIndex={0}
      aria-label={i18nTexts.a11y.label}
      // We disable the eslint rule as aria-description is valid WAI-ARIA
      // https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Annotations
      // eslint-disable-next-line jsx-a11y/aria-props
      aria-description={i18nTexts.a11y.description}
    >
      {isEmptyPromptVisible ? (
        <FieldPreviewEmptyPrompt />
      ) : (
        <>
          <FieldPreviewHeader />
          <EuiSpacer />

          <DocumentsNavPreview />
          <EuiSpacer size="s" />

          <EuiFieldSearch
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder={i18n.translate(
              'indexPatternFieldEditor.fieldPreview.filterFieldsPlaceholder',
              {
                defaultMessage: 'Filter fields',
              }
            )}
            fullWidth
            data-test-subj="filterFieldsInput"
          />
          <EuiSpacer size="s" />

          {error === null ? (
            <>
              {/* The current field(s) the user is creating */}
              {renderFieldsToPreview()}

              {/* List of other fields in the document */}
              <EuiResizeObserver onResize={onFieldListResize}>
                {(resizeRef) => (
                  <div ref={resizeRef} style={{ flex: 1 }}>
                    <PreviewFieldList
                      height={fieldListHeight}
                      clearSearch={() => setSearchValue('')}
                      searchValue={searchValue}
                      // We add a key to force rerender the virtual list whenever the window height changes
                      key={fieldListHeight}
                    />
                  </div>
                )}
              </EuiResizeObserver>
            </>
          ) : (
            <FieldPreviewError />
          )}
        </>
      )}
    </div>
  );
};
