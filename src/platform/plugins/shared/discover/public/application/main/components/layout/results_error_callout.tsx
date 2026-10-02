/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { ErrorCallout } from '@kbn/discover-utils';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { useIsEsqlMode } from '../../hooks/use_is_esql_mode';

/**
 * Error callout shown when the documents request of Discover fails.
 */
export const ResultsErrorCallout = ({ error }: { error: Error }) => {
  const { core, docLinks } = useDiscoverServices();
  const isEsqlMode = useIsEsqlMode();

  return (
    <ErrorCallout
      title={i18n.translate('discover.noResults.searchExamples.noResultsErrorTitle', {
        defaultMessage: 'Unable to retrieve search results',
      })}
      error={error}
      isEsqlMode={isEsqlMode}
      showErrorDialog={({ title, error: dialogError }) =>
        core.notifications.showErrorDialog({ title, error: dialogError })
      }
      esqlReferenceHref={docLinks.links.query.queryESQL}
    />
  );
};
