/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License v 1".
 */

import React, { useCallback, useState, useMemo, useEffect } from 'react';
import {
  EuiCallOut,
  EuiPanel,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiButtonIcon,
  EuiThemeProvider,
} from '@elastic/eui';
import useObservable from 'react-use/lib/useObservable';
import { of } from 'rxjs';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { useAppStateSelector } from '../../state_management/discover_app_state_container';
import type { DataTableRecord } from '@kbn/unified-data-table';

interface FlyoutCueProps {
  document?: DataTableRecord;
  className?: string;
  // Demo state props
  demoCanManageSpaces?: boolean;
  demoIsTrial?: boolean;
}

export const FlyoutCue: React.FC<FlyoutCueProps> = ({
  document,
  className,
  demoCanManageSpaces,
  demoIsTrial,
}) => {
  const services = useDiscoverServices();
  const [isDismissed, setIsDismissed] = useState(false);

  // Get current Discover state for navigation
  const dataViewId = useAppStateSelector((state) => state.dataSource?.dataViewId);
  const query = useAppStateSelector((state) => state.query);
  const filters = useAppStateSelector((state) => state.filters);
  const timeRange = useAppStateSelector((state) => state.time);

  // Get current solution type
  const activeSpace$ = useMemo(
    () => services.spaces?.getActiveSpace$() ?? of(undefined),
    [services.spaces]
  );
  const activeSpace = useObservable(activeSpace$);
  const solutionType = activeSpace?.solution;

  // Check if user can manage spaces (use demo state if provided, otherwise real services)
  const canManageSpaces =
    demoCanManageSpaces !== undefined
      ? demoCanManageSpaces
      : services.application.capabilities.spaces?.manage ?? false;

  // Check if current license is a trial (use demo state if provided, otherwise real services)
  const isTrial =
    demoIsTrial !== undefined ? demoIsTrial : services.licensing?.license?.type === 'trial';

  // Get conditional message based on document type and trial status
  const getBannerMessage = () => {
    if (documentType === 'span') {
      if (isTrial) {
        return 'Explore span analytics — See latency breakdowns and service dependencies in Observability.';
      } else {
        return 'Unlock span analytics — Correlate performance across services - for everyone in this space.';
      }
    } else if (documentType === 'transaction') {
      if (isTrial) {
        return 'Explore transaction analytics — See performance metrics and error rates in Observability.';
      } else {
        return 'Unlock transaction analytics — Monitor application performance - for everyone in this space.';
      }
    } else if (documentType === 'log') {
      if (isTrial) {
        return 'Explore log analytics — Search and analyze logs with advanced filtering in Observability.';
      } else {
        return 'Unlock log analytics — Centralized log management - for everyone in this space.';
      }
    }
    return '';
  };

  // Handle switch to Observability
  const handleSwitchToObservability = useCallback(async () => {
    try {
      // Get current active space
      const currentActiveSpace = await services.spaces?.getActiveSpace();
      if (!currentActiveSpace) {
        console.warn('Could not get active space');
        return;
      }

      // Update the space with Observability solution view
      const updatedSpace = {
        ...currentActiveSpace,
        solution: 'oblt' as const,
      };

      // Make API call to update the space
      await services.http.put(`/api/spaces/space/${encodeURIComponent(currentActiveSpace.id)}`, {
        query: { overwrite: true },
        body: JSON.stringify(updatedSpace),
      });

      // Small delay to ensure the update completes
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Add URL parameter to trigger tour modal after reload
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set('showObservabilityTour', 'true');

      // Navigate to the new URL to trigger the tour modal
      window.location.href = currentUrl.toString();
    } catch (error) {
      console.error('Failed to switch to Observability:', error);
      // Fallback: navigate to space settings
      const currentSpace = await services.spaces?.getActiveSpace();
      if (currentSpace) {
        services.application.navigateToUrl(
          services.addBasePath(`/app/management/kibana/spaces/edit/${currentSpace.id}`)
        );
      }
    }
  }, [services]);

  const handleDismiss = useCallback(() => {
    setIsDismissed(true);
  }, []);

  // Check if this is an APM document (span, transaction) or log document
  const documentType = useMemo(() => {
    if (!document) return null;

    const source = document.raw._source;
    const fields = document.raw.fields;

    // Check processor.event
    const processorEvent = source?.processor?.event || fields?.['processor.event']?.[0];

    // Check for required common fields
    const hasTimestamp = source?.['@timestamp'] || fields?.['@timestamp']?.[0];

    if (!hasTimestamp) {
      return null;
    }

    // Check for APM documents (span/transaction)
    if (processorEvent === 'span' || processorEvent === 'transaction') {
      // Check for traces data stream and index pattern
      const hasTracesDataStream = fields?.['data_stream.type']?.[0] === 'traces';
      const isTracesIndex = !!document.raw._index?.match(/^(\.ds-)?traces-/);

      if (!hasTracesDataStream || !isTracesIndex) {
        return null;
      }

      // Check for required trace fields
      const hasTraceId = source?.trace?.id || fields?.['trace.id']?.[0];

      if (!hasTraceId) {
        return null;
      }

      if (processorEvent === 'span') {
        // Check for required span fields
        const hasSpanId = source?.span?.id || fields?.['span.id']?.[0];
        const hasSpanDuration = source?.span?.duration?.us || fields?.['span.duration.us']?.[0];

        if (hasSpanId && hasSpanDuration) {
          return 'span';
        }
      } else if (processorEvent === 'transaction') {
        // Check for required transaction fields
        const hasTransactionId = source?.transaction?.id || fields?.['transaction.id']?.[0];
        const hasTransactionName = source?.transaction?.name || fields?.['transaction.name']?.[0];
        const hasTransactionType = source?.transaction?.type || fields?.['transaction.type']?.[0];
        const hasTransactionDuration =
          source?.transaction?.duration?.us || fields?.['transaction.duration.us']?.[0];

        if (
          hasTransactionId &&
          hasTransactionName &&
          hasTransactionType &&
          hasTransactionDuration
        ) {
          return 'transaction';
        }
      }
    }

    // Check for log documents
    if (processorEvent === 'log' || processorEvent === 'error') {
      // Check for message field (preferred: message, fallback: event.original)
      const hasMessage =
        source?.message ||
        fields?.['message']?.[0] ||
        source?.event?.original ||
        fields?.['event.original']?.[0];

      if (!hasMessage) {
        return null;
      }

            // Check data stream context
      const hasLogsDataStream = fields?.['data_stream.type']?.[0] === 'logs';
      const hasEventDataset = source?.event?.dataset || fields?.['event.dataset']?.[0];
      
      // For both log and error events, only allow logs data streams
      const hasValidDataStream = hasLogsDataStream || hasEventDataset;

      if (!hasValidDataStream) {
        return null;
      }

      // Check for attribution (any of these): service.name, host.name, container.id, or cloud.provider
      const hasAttribution =
        source?.service?.name ||
        fields?.['service.name']?.[0] ||
        source?.host?.name ||
        fields?.['host.name']?.[0] ||
        source?.container?.id ||
        fields?.['container.id']?.[0] ||
        source?.cloud?.provider ||
        fields?.['cloud.provider']?.[0];

      if (hasAttribution) {
        return 'log';
      }
    }

    return null;
  }, [document]);

  // Don't render if:
  // - We're in Observability solution (not Classic)
  // - Not an APM document (span/transaction) or log document
  // - User dismissed the banner
  // - User cannot manage spaces
  const shouldRenderBanner =
    solutionType !== 'oblt' && documentType !== null && !isDismissed && canManageSpaces;

  if (!shouldRenderBanner) {
    return null;
  }

  return (
    <EuiThemeProvider colorMode="dark">
      <EuiPanel
        borderRadius="none"
        paddingSize="s"
        hasShadow={false}
        hasBorder
      >
        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiFlexGroup alignItems="center" justifyContent="flexStart" gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiIcon color="success" type="apmApp" />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <span>
                  <strong>
                    {documentType === 'span'
                      ? 'Span'
                      : documentType === 'transaction'
                      ? 'Transaction'
                      : documentType === 'log'
                      ? 'Log'
                      : 'Unknown'}{' '}
                    data detected
                  </strong>
                  {/* . {getBannerMessage()} */}
                </span>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup alignItems="center" justifyContent="flexEnd" gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  color="success"
                  iconType="cross"
                  onClick={handleDismiss}
                  aria-label="Dismiss"
                  size="s"
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  onClick={handleSwitchToObservability}
                  data-test-subj="obsFlyoutSpanCueSwitchBtn"
                  size="s"
                  color="success"
                  fill
                >
                  Try Observability
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </EuiThemeProvider>
  );
};
