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

export const TotalDocuments = ({
  totalHitCount,
  isEsqlMode,
}: {
  totalHitCount: number;
  isEsqlMode?: boolean;
}) => {
  const totalDocuments = (
    <strong>
      <FormattedNumber value={totalHitCount} />
    </strong>
  );

  return (
    <EuiText
      grow={false}
      size="s"
      style={{ paddingRight: 2 }}
      data-test-subj="savedSearchTotalDocuments"
    >
      {isEsqlMode ? (
        <FormattedMessage
          id="discover.embeddable.totalResults"
          defaultMessage="{totalDocuments} {totalHitCount, plural, one {result} other {results}}"
          values={{
            totalDocuments,
            totalHitCount,
          }}
        />
      ) : (
        <FormattedMessage
          id="discover.embeddable.totalDocuments"
          defaultMessage="{totalDocuments} {totalHitCount, plural, one {document} other {documents}}"
          values={{
            totalDocuments,
            totalHitCount,
          }}
        />
      )}
    </EuiText>
  );
};
