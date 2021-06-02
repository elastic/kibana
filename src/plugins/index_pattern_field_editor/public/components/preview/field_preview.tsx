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
import { PreviewDocumentsNav } from './preview_documents_nav';
import { FieldPreviewError } from './field_preview_error';
import { PreviewFieldList } from './field_list/field_list';

export const FieldPreview = () => {
  const [fieldListHeight, setFieldListHeight] = useState(-1);

  const {
    params: {
      value: { name, script, format },
    },
    error,
  } = useFieldPreviewContext();

  // To show the preview we at least need a name to be defined and the script or the format
  const isEmptyPromptVisible = name === null || (script !== null && format !== null);

  const onFieldListResize = useCallback(({ height }: { height: number }) => {
    setFieldListHeight(height);
  }, []);

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
            <EuiResizeObserver onResize={onFieldListResize}>
              {(resizeRef) => (
                <div ref={resizeRef} style={{ flex: 1 }}>
                  <PreviewFieldList height={fieldListHeight} />
                </div>
              )}
            </EuiResizeObserver>
          ) : (
            <FieldPreviewError />
          )}
        </>
      )}
    </>
  );
};
