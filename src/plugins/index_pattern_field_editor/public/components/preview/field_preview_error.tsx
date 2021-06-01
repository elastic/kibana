/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import { EuiCallOut } from '@elastic/eui';

import { useFieldPreviewContext } from './field_preview_context';

export const FieldPreviewError = () => {
  const { error } = useFieldPreviewContext();

  if (error === null) {
    return null;
  }

  return (
    <EuiCallOut
      title="Preview error"
      color="danger"
      iconType="cross"
      data-test-subj="formFormatError"
    >
      <p>{error.error.message}</p>
      {error.code === 'PAINLESS_SCRIPT_ERROR' && <p>{error.error.reason}</p>}
    </EuiCallOut>
  );
};
