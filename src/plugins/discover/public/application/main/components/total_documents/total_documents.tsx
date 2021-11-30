/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiText } from '@elastic/eui';

export const TotalDocuments = ({ totalHitCount }: { totalHitCount: number }) => {
  return (
    <EuiText grow={false} size="s" style={{ paddingRight: 2 }}>
      <FormattedMessage
        id="discover.docTable.totalDocuments"
        defaultMessage="{totalDocuments} documents"
        values={{
          totalDocuments: <strong>{totalHitCount}</strong>,
        }}
      />
    </EuiText>
  );
};
