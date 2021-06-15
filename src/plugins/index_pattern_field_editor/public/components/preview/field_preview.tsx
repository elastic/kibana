/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useState, useCallback } from 'react';
import { EuiSpacer, EuiResizeObserver } from '@elastic/eui';

import { useFieldPreviewContext } from './field_preview_context';
import { FieldPreviewHeader } from './field_preview_header';
import { FieldPreviewEmptyPrompt } from './field_preview_empty_prompt';
import { DocumentsNavPreview } from './documents_nav_preview';
import { FieldPreviewError } from './field_preview_error';
import { PreviewListItem } from './field_list/field_list_item';
import { PreviewFieldList } from './field_list/field_list';

import './field_preview.scss';

export const FieldPreview = () => {
  const [fieldListHeight, setFieldListHeight] = useState(-1);

  const {
    params: {
      value: { name, script, format },
    },
    previewCount,
    fields,
    error,
  } = useFieldPreviewContext();

  // To show the preview we at least need a name to be defined, the script or the format
  // and an first response from the _execute API
  const isEmptyPromptVisible =
    error !== null || fields.length > 0
      ? false
      : previewCount === 0
      ? true
      : name === null || (script === null && format === null);

  const onFieldListResize = useCallback(({ height }: { height: number }) => {
    setFieldListHeight(height);
  }, []);

  const renderPinnedFields = () => {
    if (fields.length === 0) {
      return null;
    }

    return (
      <div>
        <PreviewListItem
          field={{ key: fields[0].key, value: JSON.stringify(fields[0].value) }}
          highlighted
        />
      </div>
    );
  };

  return (
    <div className="indexPatternFieldEditor__previewPannel">
      {isEmptyPromptVisible ? (
        <FieldPreviewEmptyPrompt />
      ) : (
        <>
          <FieldPreviewHeader />
          <EuiSpacer />

          <DocumentsNavPreview />
          <EuiSpacer />

          {error === null ? (
            <>
              {/* The current field(s) the user is creating and fields he has pinned to the top */}
              {renderPinnedFields()}

              {/* List of other fields in the document */}
              <EuiResizeObserver onResize={onFieldListResize}>
                {(resizeRef) => (
                  <div ref={resizeRef} style={{ flex: 1 }}>
                    <PreviewFieldList
                      height={fieldListHeight}
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
