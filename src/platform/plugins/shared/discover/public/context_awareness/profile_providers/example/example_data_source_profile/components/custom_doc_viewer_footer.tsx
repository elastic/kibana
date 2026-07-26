/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiCallOut } from '@elastic/eui';
import { getFieldValue } from '@kbn/discover-utils';
import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';

export const CustomDocViewerFooter: React.FC<DocViewRenderProps> = ({ hit }) => {
  const message = getFieldValue(hit, 'message')?.toString();

  return (
    <EuiCallOut
      title="Example custom footer"
      color="primary"
      iconType="info"
      data-test-subj="exampleCustomDocViewerFooter"
    >
      <p>
        This is a custom footer rendered via the <code>renderFooter</code> extension point.
      </p>
      {message && (
        <p>
          <strong>Message preview:</strong> <em>{message.substring(0, 100)}</em>
          {message.length > 100 && '...'}
        </p>
      )}
    </EuiCallOut>
  );
};
