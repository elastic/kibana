/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { FormattedMessage, FormattedNumber } from '@kbn/i18n-react';
import { EuiText } from '@elastic/eui';

export const TotalDocuments = ({ totalHitCount }: { totalHitCount: number }) => {
  return (
    <EuiText
      grow={false}
      size="s"
      style={{ paddingRight: 2 }}
      data-test-subj="savedSearchTotalDocuments"
    >
      <FormattedMessage
        id="discover.docTable.totalDocuments"
        defaultMessage="{totalDocuments} documents"
        values={{
          totalDocuments: (
            <strong>
              <FormattedNumber value={totalHitCount} />
            </strong>
          ),
        }}
      />
    </EuiText>
  );
};
