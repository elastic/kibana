/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useState } from 'react';
import { getFlattenedTraceDocumentOverview, type DataTableRecord } from '@kbn/discover-utils';
import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import {
  AGENT_NAME,
  AT_TIMESTAMP,
  DURATION,
  ENVIRONMENT_ALL_VALUE,
  HTTP_RESPONSE_STATUS_CODE,
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  SPAN_DESTINATION_SERVICE_RESOURCE,
  SPAN_DURATION,
  SPAN_ID,
  SPAN_NAME,
  SPAN_SUBTYPE,
  SPAN_TYPE,
  TRACE_ID,
  TRANSACTION_DURATION,
  TRANSACTION_ID,
  TRANSACTION_NAME,
  USER_AGENT_NAME,
  USER_AGENT_VERSION,
} from '@kbn/apm-types';
import { EuiPanel } from '@elastic/eui';
import { Duration } from '@kbn/apm-ui-shared';
import { ContentFrameworkTable } from '../../../../content_framework';
import { isTransaction } from '../../helpers';
import {
  getSharedFieldConfigurations,
  getSpanFieldConfigurations,
  getTransactionFieldConfigurations,
} from './field_configurations';
import { useFetchTraceRootSpanContext } from '../../doc_viewer_overview/hooks/use_fetch_trace_root_span';
import { getUnifiedDocViewerServices } from '../../../../../plugin';
import { useFlyoutHistoryKey } from '../../../../doc_viewer_flyout/flyout_history_key_context';
import { useDocViewerExtensionActionsContext } from '../../../../../hooks/use_doc_viewer_extension_actions';
import { TRACES_DOC_VIEWER_EBT_SOURCES } from '../../ebt_constants';

const spanFieldNames = [
  SPAN_ID,
  SPAN_NAME,
  TRACE_ID,
  SERVICE_NAME,
  SPAN_DURATION,
  SPAN_DESTINATION_SERVICE_RESOURCE,
  AT_TIMESTAMP,
  HTTP_RESPONSE_STATUS_CODE,
  SPAN_TYPE,
  SPAN_SUBTYPE,
];

const transactionFieldNames = [
  TRANSACTION_ID,
  TRANSACTION_NAME,
  TRACE_ID,
  SERVICE_NAME,
  TRANSACTION_DURATION,
  AT_TIMESTAMP,
  HTTP_RESPONSE_STATUS_CODE,
  USER_AGENT_NAME,
  USER_AGENT_VERSION,
];

export interface AboutProps
  extends Pick<DocViewRenderProps, 'filter' | 'onAddColumn' | 'onRemoveColumn' | 'columns'> {
  hit: DataTableRecord;
  dataView: DocViewRenderProps['dataView'];
}

export const About = ({
  hit,
  dataView,
  filter,
  onAddColumn,
  onRemoveColumn,
  columns,
}: AboutProps) => {
  const isSpan = !isTransaction(hit);
  const flattenedHit = useMemo(() => getFlattenedTraceDocumentOverview(hit), [hit]);
  const traceRootSpan = useFetchTraceRootSpanContext();
  const traceRootSpanDuration = traceRootSpan?.span?.duration;

  const [serviceFlyoutOpen, setServiceFlyoutOpen] = useState(false);
  const flyoutHistoryKey = useFlyoutHistoryKey();
  const docViewerActions = useDocViewerExtensionActionsContext();
  const openInNewTab = docViewerActions?.openInNewTab;

  const { data: dataService, core, discoverShared } = getUnifiedDocViewerServices();
  const canViewApm = core.application.capabilities.apm?.show || false;
  const serviceFlyoutFeature = discoverShared.features.registry.getById(
    'observability-service-flyout'
  );
  const { from: timeRangeFrom, to: timeRangeTo } =
    dataService.query.timefilter.timefilter.getTime();

  const onServiceNameClick = useCallback(() => setServiceFlyoutOpen(true), []);

  const aboutFieldConfigurations = useMemo(() => {
    const configurations = {
      ...getSharedFieldConfigurations(flattenedHit, onServiceNameClick),
      ...(isSpan
        ? getSpanFieldConfigurations(flattenedHit)
        : getTransactionFieldConfigurations(flattenedHit)),
    };

    const durationField = isSpan ? SPAN_DURATION ?? DURATION : TRANSACTION_DURATION;
    configurations[durationField] = {
      ...configurations[durationField],
      formatter: (value: unknown) => (
        <Duration
          duration={value as number}
          size="xs"
          parent={{
            duration: traceRootSpanDuration,
            type: 'trace',
          }}
        />
      ),
    };

    return configurations;
  }, [flattenedHit, isSpan, traceRootSpanDuration, onServiceNameClick]);

  return (
    <>
      <EuiPanel hasBorder={true} hasShadow={false} paddingSize="s">
        <ContentFrameworkTable
          fieldNames={isSpan ? spanFieldNames : transactionFieldNames}
          id={'aboutTable'}
          fieldConfigurations={aboutFieldConfigurations}
          dataView={dataView}
          hit={hit}
          filter={filter}
          onAddColumn={onAddColumn}
          onRemoveColumn={onRemoveColumn}
          columns={columns}
        />
      </EuiPanel>
      {serviceFlyoutOpen &&
        serviceFlyoutFeature &&
        canViewApm &&
        serviceFlyoutFeature.renderServiceFlyout({
          service: {
            name: flattenedHit[SERVICE_NAME] ?? '',
            agentName: flattenedHit[AGENT_NAME],
          },
          filters: {
            environment: flattenedHit[SERVICE_ENVIRONMENT] ?? ENVIRONMENT_ALL_VALUE,
            rangeFrom: timeRangeFrom,
            rangeTo: timeRangeTo,
          },
          source: TRACES_DOC_VIEWER_EBT_SOURCES.ABOUT,
          onClose: () => setServiceFlyoutOpen(false),
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
};
