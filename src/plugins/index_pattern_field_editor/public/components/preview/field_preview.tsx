/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import { EuiSpacer } from '@elastic/eui';

import { FieldPreviewHeader } from './field_preview_header';
import { FieldPreviewEmptyPrompt } from './field_preview_empty_prompt';

export const FieldPreview = () => {
  const isHeaderVisible = false;

  return (
    <>
      {isHeaderVisible && (
        <>
          <FieldPreviewHeader />
          <EuiSpacer />
        </>
      )}
      <FieldPreviewEmptyPrompt />
    </>
  );
};
