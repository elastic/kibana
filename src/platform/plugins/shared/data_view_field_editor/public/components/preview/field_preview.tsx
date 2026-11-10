/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, useCallback } from 'react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { KbnWarningCallout } from '@kbn/ui-callout';
import { EuiSpacer, EuiResizeObserver, EuiFieldSearch } from '@elastic/eui';

import { useFieldPreviewContext } from './field_preview_context';
import { FieldPreviewHeader } from './field_preview_header';
import { FieldPreviewEmptyPrompt } from './field_preview_empty_prompt';
import { DocumentsNavPreview } from './documents_nav_preview';
import { FieldPreviewError } from './field_preview_error';
import { PreviewListItem } from './field_list/field_list_item';
import { PreviewFieldList } from './field_list/field_list';
import {
  ITEM_HEIGHT,
  SHOW_MORE_HEIGHT,
  INITIAL_MAX_NUMBER_OF_FIELDS,
} from './field_list/constants';
import { useStateSelector } from '../../state_utils';
import type { PreviewState } from './types';

const previewResponseSelector = (state: PreviewState) => state.previewResponse;
const fetchDocErrorSelector = (state: PreviewState) => state.fetchDocError;
const isLoadingPreviewSelector = (state: PreviewState) => state.isLoadingPreview;
const isPreviewAvailableSelector = (state: PreviewState) => state.isPreviewAvailable;

export const FieldPreview = () => {
  const [fieldListHeight, setFieldListHeight] = useState(-1);
  const [searchValue, setSearchValue] = useState('');

  const {
    params: {
      value: { name, customLabel, script, format, type, parentName },
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

  // The custom label applies to the field as a whole, so it does not replace the
  // "<parent>.<subfield>" keys of composite subfield rows
  const previewRowLabel =
    type !== 'composite' && !parentName ? customLabel ?? undefined : undefined;

  const renderFieldsToPreview = () => {
    if (fields.length === 0) {
      return null;
    }

    return (
      <ul>
        {fields.map((field, i) => (
          <li key={i} data-test-subj="fieldPreviewItem">
            <PreviewListItem
              field={field}
              label={previewRowLabel}
              isFromScript
              hasScriptError={Boolean(error)}
            />
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div
      css={styles.previewPanel}
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
            <KbnWarningCallout
              announceOnMount
              title={i18n.translate(
                'indexPatternFieldEditor.fieldPreview.notAvailableWarningCallout.title',
                {
                  defaultMessage: 'Preview not available',
                }
              )}
              text={i18n.translate(
                'indexPatternFieldEditor.fieldPreview.notAvailableWarningCallout.description',
                {
                  defaultMessage:
                    'Runtime field preview is disabled because no documents could be fetched from the cluster.',
                }
              )}
              role="alert"
              data-test-subj="previewNotAvailableCallout"
            />
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
                      <div ref={resizeRef} css={styles.fieldListContainer}>
                        <PreviewFieldList
                          height={fieldListHeight}
                          clearSearch={() => setSearchValue('')}
                          searchValue={searchValue}
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

const styles = {
  previewPanel: css({
    display: 'flex',
    flexDirection: 'column',
    // Let the panel scroll when the previewed fields (e.g. composite subfields) overflow the flyout.
    minHeight: '100%',
  }),
  fieldListContainer: css({
    flex: 1,
    // The list height is measured from this container, so the container must not be sized by the
    // list: a fixed min-height prevents a resize loop that makes the panel scrollbar jump.
    minHeight: INITIAL_MAX_NUMBER_OF_FIELDS * ITEM_HEIGHT + SHOW_MORE_HEIGHT,
  }),
};
