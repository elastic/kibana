/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiLink } from '@elastic/eui';
import { getRouterLinkProps } from '@kbn/router-utils';
import React, { useState } from 'react';
import { EBT_CLICK_ACTIONS, getEbtProps, type EbtClickAttrs } from '@kbn/ebt-click';
import { ENVIRONMENT_ALL_VALUE } from '@kbn/apm-types';
import { getUnifiedDocViewerServices } from '../../../../plugin';
import { useFlyoutHistoryKey } from '../../../doc_viewer_flyout/flyout_history_key_context';
import { useDocViewerExtensionActionsContext } from '../../../../hooks/use_doc_viewer_extension_actions';
import { ServiceNameWithIcon } from './service_name_with_icon';
import { TRACES_DOC_VIEWER_EBT_SOURCES } from '../ebt_constants';

const SERVICE_OVERVIEW_LOCATOR_ID = 'serviceOverviewLocator';

interface ServiceNameLinkProps {
  serviceName: string;
  agentName?: string;
  environment?: string;
  formattedServiceName: React.ReactNode;
  'data-test-subj': string;
  ebt: Omit<EbtClickAttrs, 'action'>;
}

export function ServiceNameLink({
  serviceName,
  agentName,
  environment,
  formattedServiceName,
  'data-test-subj': dataTestSubj,
  ebt,
}: ServiceNameLinkProps) {
  const {
    share: { url: urlService },
    core,
    data: dataService,
    discoverShared,
  } = getUnifiedDocViewerServices();

  const [flyoutOpen, setFlyoutOpen] = useState(false);
  const flyoutHistoryKey = useFlyoutHistoryKey();
  const docViewerActions = useDocViewerExtensionActionsContext();
  const openInNewTab = docViewerActions?.openInNewTab;

  const { from: timeRangeFrom, to: timeRangeTo } =
    dataService.query.timefilter.timefilter.getTime();

  const canViewApm = core.application.capabilities.apm?.show || false;

  const serviceFlyoutFeature = discoverShared.features.registry.getById(
    'observability-service-flyout'
  );

  const content = <ServiceNameWithIcon agentName={agentName} serviceName={formattedServiceName} />;

  if (serviceFlyoutFeature && canViewApm) {
    return (
      <>
        <EuiLink
          onClick={() => setFlyoutOpen(true)}
          data-test-subj={dataTestSubj}
          {...getEbtProps({ action: EBT_CLICK_ACTIONS.VIEW_SERVICE, ...ebt })}
        >
          {content}
        </EuiLink>
        {flyoutOpen &&
          serviceFlyoutFeature.renderServiceFlyout({
            service: { name: serviceName, agentName },
            filters: {
              environment: environment ?? ENVIRONMENT_ALL_VALUE,
              rangeFrom: timeRangeFrom,
              rangeTo: timeRangeTo,
            },
            source: TRACES_DOC_VIEWER_EBT_SOURCES.ABOUT,
            onClose: () => setFlyoutOpen(false),
            flyoutHistoryKey,
            contextActions: {
              openInNewDiscoverTab: openInNewTab
                ? ({ esqlQuery, timeRange, tabLabel }) =>
                    openInNewTab({ query: { esql: esqlQuery }, timeRange, tabLabel })
                : undefined,
            },
          })}
      </>
    );
  }

  // Fallback: no flyout feature registered (or no APM access) — render a direct APM link instead.
  const apmLinkToServiceEntityLocator = urlService.locators.get<{
    serviceName: string;
    rangeFrom: string;
    rangeTo: string;
  }>(SERVICE_OVERVIEW_LOCATOR_ID);

  const href = apmLinkToServiceEntityLocator?.getRedirectUrl({
    serviceName,
    rangeFrom: timeRangeFrom,
    rangeTo: timeRangeTo,
  });

  const routeLinkProps = href
    ? getRouterLinkProps({
        href,
        onClick: () => {
          apmLinkToServiceEntityLocator?.navigate({
            serviceName,
            rangeFrom: timeRangeFrom,
            rangeTo: timeRangeTo,
          });
        },
      })
    : undefined;

  return (
    <>
      {canViewApm && routeLinkProps ? (
        <EuiLink
          {...routeLinkProps}
          data-test-subj={dataTestSubj}
          {...getEbtProps({ action: EBT_CLICK_ACTIONS.VIEW_SERVICE, ...ebt })}
        >
          {content}
        </EuiLink>
      ) : (
        content
      )}
    </>
  );
}
