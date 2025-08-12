/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiCodeBlock } from '@elastic/eui';
import React from 'react';
import type { DataTableRecordWithContext } from '../../../profiles_manager';

export const DocumentJsonDisplay = ({ record }: { record: DataTableRecordWithContext }) => {
  return (
    <EuiCodeBlock
      language="json"
      data-test-subj="profilesInspectorViewDocumentJsonDisplay"
      overflowHeight={300}
      isVirtualized
      isCopyable
      transparentBackground
      paddingSize="none"
      css={{ width: '100%' }}
    >
      {JSON.stringify(record.raw, null, 2)}
    </EuiCodeBlock>
  );
};
