/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiCallOut } from '@elastic/eui';
import { SurrDocType } from '../../services/context';

export function ActionBarWarning({ docCount, type }: { docCount: number; type: SurrDocType }) {
  if (type === SurrDocType.PREDECESSORS) {
    return (
      <EuiCallOut
        color="warning"
        data-test-subj="predecessorsWarningMsg"
        iconType="bolt"
        title={
          docCount === 0 ? (
            <FormattedMessage
              id="discover.context.newerDocumentsWarningZero"
              defaultMessage="No documents newer than the anchor could be found."
            />
          ) : (
            <FormattedMessage
              id="discover.context.newerDocumentsWarning"
              defaultMessage="Only {docCount} documents newer than the anchor could be found."
              values={{ docCount }}
            />
          )
        }
        size="s"
      />
    );
  }

  return (
    <EuiCallOut
      color="warning"
      data-test-subj="successorsWarningMsg"
      iconType="bolt"
      title={
        docCount === 0 ? (
          <FormattedMessage
            id="discover.context.olderDocumentsWarningZero"
            defaultMessage="No documents older than the anchor could be found."
          />
        ) : (
          <FormattedMessage
            id="discover.context.olderDocumentsWarning"
            defaultMessage="Only {docCount} documents older than the anchor could be found."
            values={{ docCount }}
          />
        )
      }
      size="s"
    />
  );
}
