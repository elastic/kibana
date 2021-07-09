/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiCallOut, EuiLink } from '@elastic/eui';
import { getCoreStart } from '../../services';

export const DeprecationWarning = () => {
  const documentationLink = useMemo(
    () => getCoreStart().docLinks.links.visualize.aggregationBased,
    []
  );

  return (
    <EuiCallOut
      data-test-subj="vizDeprecationWarning"
      title={
        <FormattedMessage
          id="visualize.legacyCharts.notificationMessage"
          defaultMessage="Deprecated since 7.12, the legacy XY charts will be removed in 7.16. {documentationLink} our new charts library!"
          values={{
            documentationLink: (
              <EuiLink href={documentationLink} target="_blank" external>
                <FormattedMessage
                  id="visualize.legacyCharts.documentationLink"
                  defaultMessage="Check out"
                />
              </EuiLink>
            ),
          }}
        />
      }
      iconType="alert"
      color="warning"
      size="s"
    />
  );
};
