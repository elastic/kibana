/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiSpacer, EuiResizeObserver, EuiFieldSearch, EuiCallOut } from '@elastic/eui';

import { useFieldPreviewContext } from './field_preview_context';
import { FieldPreviewHeader } from './field_preview_header';
import { FieldPreviewEmptyPrompt } from './field_preview_empty_prompt';
import { DocumentsNavPreview } from './documents_nav_preview';
import { FieldPreviewError } from './field_preview_error';
import { PreviewListItem } from './field_list/field_list_item';
import { PreviewFieldList } from './field_list/field_list';
import { useStateSelector } from '../../state_utils';
import { PreviewState } from './types';

import './field_preview.scss';

const previewResponseSelector = (state: PreviewState) => state.previewResponse;
const fetchDocErrorSelector = (state: PreviewState) => state.fetchDocError;
const isLoadingPreviewSelector = (state: PreviewState) => state.isLoadingPreview;
const isPreviewAvailableSelector = (state: PreviewState) => state.isPreviewAvailable;

export const FieldPreview = () => {
  const [fieldListHeight, setFieldListHeight] = useState(-1);
  const [searchValue, setSearchValue] = useState('');

  const {
    params: {
      value: { name, script, format },
    },
    controller,
  } = useFieldPreviewContext();
  const { fields, error } = useStateSelector(controller.state$, previewResponseSelector);
  const fetchDocError = useStateSelector(controller.state$, fetchDocErrorSelector);
  const isLoadingPreview = useStateSelector(controller.state$, isLoadingPreviewSelector);
  const isPreviewAvailable = useStateSelector(controller.state$, isPreviewAvailableSelector);

  // To show the preview we at least need a name to be defined, the script or the format
  // and an first response from the _execute API
  let isEmptyPromptVisible = false;
  const noParamDefined = name === null && script === null && format === null;
  const haveResultFromPreview = error !== null || fields.length > 0;

  if (noParamDefined) {
    isEmptyPromptVisible = true;
  } else if (!haveResultFromPreview && !isLoadingPreview && name === null && format === null) {
    isEmptyPromptVisible = true;
  }

  const doRenderListOfFields = fetchDocError === null;
  const showWarningPreviewNotAvailable = isPreviewAvailable === false && fetchDocError === null;

  const onFieldListResize = useCallback(({ height }: { height: number }) => {
    setFieldListHeight(height);
  }, []);

  const renderFieldsToPreview = () => {
    if (fields.length === 0) {
      return null;
    }

    return (
      <ul>
        {fields.map((field, i) => (
          <li key={i} data-test-subj="fieldPreviewItem">
            <PreviewListItem field={field} isFromScript hasScriptError={Boolean(error)} />
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div
      className="indexPatternFieldEditor__previewPannel"
      // This tabIndex is for the scrollable area of the flyout panel.
      tabIndex={0}
    >
      {isEmptyPromptVisible ? (
        <FieldPreviewEmptyPrompt />
      ) : (
        <>
          <FieldPreviewHeader />
          <EuiSpacer />

          {showWarningPreviewNotAvailable ? (
            <EuiCallOut
              title={i18n.translate(
                'indexPatternFieldEditor.fieldPreview.notAvailableWarningCallout.title',
                {
                  defaultMessage: 'Preview not available',
                }
              )}
              color="warning"
              iconType="warning"
              role="alert"
              data-test-subj="previewNotAvailableCallout"
            >
              <p>
                {i18n.translate(
                  'indexPatternFieldEditor.fieldPreview.notAvailableWarningCallout.description',
                  {
                    defaultMessage:
                      'Runtime field preview is disabled because no documents could be fetched from the cluster.',
                  }
                )}
              </p>
            </EuiCallOut>
          ) : (
            <>
              <DocumentsNavPreview />
              <EuiSpacer size="s" />

              {doRenderListOfFields && (
                <>
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
                </>
              )}

              <FieldPreviewError />
              <EuiSpacer size="s" />

              {doRenderListOfFields && (
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
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};
