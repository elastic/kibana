/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, useMemo } from 'react';
import { EuiCodeBlock, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { FormattedStatus } from '../lib';

interface StatusExpandedRowProps {
  status: FormattedStatus;
}

export const StatusExpandedRow: FC<StatusExpandedRowProps> = ({ status }) => {
  const { original } = status;
  const statusAsString = useMemo(() => JSON.stringify(original, null, 2), [original]);

  return (
    <EuiFlexGroup>
      <EuiFlexItem grow={true}>
        <EuiCodeBlock
          language="json"
          overflowHeight={300}
          isCopyable
          paddingSize="none"
          transparentBackground={true}
        >
          {statusAsString}
        </EuiCodeBlock>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
