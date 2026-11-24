/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { isEqual } from 'lodash';
import { isOfAggregateQueryType, type AggregateQuery, type Query } from '@kbn/es-query';
import { ErrorCallout } from '@kbn/discover-utils/components';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { EsqlErrorHelp } from '../../../../components/common/esql_error_help';
import { useHasEnterpriseLicense } from '../../../../components/common/use_has_enterprise_license';
import { useIsEsqlMode } from '../../hooks/use_is_esql_mode';
import {
  internalStateActions,
  useAppStateSelector,
  useCurrentTabAction,
  useInternalStateDispatch,
} from '../../state_management/redux';

export interface DiscoverSearchErrorCalloutProps {
  error: Error;
  /** The query of the failed request, AI help is only offered while it is still the active query */
  failedQuery?: AggregateQuery | Query;
}

/**
 * Error callout shown when a Discover search request fails, including ES|QL AI help when available.
 */
export const DiscoverSearchErrorCallout = ({
  error,
  failedQuery,
}: DiscoverSearchErrorCalloutProps): React.ReactElement => {
  const { core, docLinks, licensing } = useDiscoverServices();
  const dispatch = useInternalStateDispatch();
  const updateESQLQuery = useCurrentTabAction(internalStateActions.updateESQLQuery);
  const query = useAppStateSelector((state) => state.query);
  const isEsqlMode = useIsEsqlMode();
  const hasEnterpriseLicense = useHasEnterpriseLicense(licensing);

  const connectorsUrl = core.application.capabilities.management?.insightsAndAlerting
    ?.triggersActionsConnectors
    ? core.application.getUrlForApp('management', {
        deepLinkId: 'triggersActionsConnectors',
        path: '/connectors',
      })
    : undefined;

  const isActiveQuery = !failedQuery || isEqual(failedQuery, query);
  const aiHelp =
    isEsqlMode && isOfAggregateQueryType(query) && hasEnterpriseLicense && isActiveQuery ? (
      <EsqlErrorHelp
        http={core.http}
        query={query.esql}
        errorMessage={error.message}
        connectorsUrl={connectorsUrl}
        onApplyQuery={(esql) => dispatch(updateESQLQuery({ queryOrUpdater: esql }))}
      />
    ) : undefined;

  const errorCallout = (
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
      aiHelp={aiHelp}
    />
  );

  // The AI help can be taller than the available space, so it needs its own scroll container
  return aiHelp ? <div css={errorContainerCss}>{errorCallout}</div> : errorCallout;
};

const errorContainerCss = css({
  overflowY: 'auto',
  flex: '1 1 auto',
  minHeight: 0,
});
