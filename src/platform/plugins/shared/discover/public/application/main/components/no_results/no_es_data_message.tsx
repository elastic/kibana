/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { INTEGRATIONS_BROWSE_PATH } from '../../../../constants';

/**
 * Shown instead of the search suggestions when the cluster doesn't contain any data yet,
 * since no adjustment of the search criteria would return results in that case
 */
export const NoEsDataMessage = () => {
  const { core } = useDiscoverServices();
  const canAccessIntegrations = Boolean(core.application.capabilities.navLinks.integrations);

  return (
    <p data-test-subj="discoverNoEsDataMessage">
      <FormattedMessage
        id="discover.noResults.noEsDataDescription"
        defaultMessage="There is no data in Elasticsearch yet. Add data to start exploring it here."
      />
      {canAccessIntegrations && (
        <>
          {' '}
          <EuiLink
            href={core.http.basePath.prepend(INTEGRATIONS_BROWSE_PATH)}
            data-test-subj="discoverNoEsDataBrowseIntegrations"
          >
            <FormattedMessage
              id="discover.noResults.browseIntegrationsLinkLabel"
              defaultMessage="Browse integrations"
            />
          </EuiLink>
        </>
      )}
    </p>
  );
};
