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
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiButtonEmpty,
} from '@elastic/eui';
import useObservable from 'react-use/lib/useObservable';
import { of } from 'rxjs';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { useAppStateSelector } from '../../state_management/discover_app_state_container';
import { useCurrentDataView } from '../../state_management/redux';
import { ObservabilityTourModal, TourHighlight } from './observability_tour_modal';
import { useMainPageObservabilityProbe } from './use_main_page_observability_probe';

const STORAGE_KEY = 'obs_main_page_modal_dismissed';

interface MainPageObservabilityCueProps {
  className?: string;
  // Demo state props
  demoCanManageSpaces: boolean;
  setDemoCanManageSpaces: (value: boolean) => void;
  demoIsTrial: boolean;
  setDemoIsTrial: (value: boolean) => void;
  demoHideFullCallout: boolean;
  setDemoHideFullCallout: (value: boolean) => void;
  onResetToClassic: () => void;
}

export const MainPageObservabilityCue: React.FC<MainPageObservabilityCueProps> = ({ 
  className,
  demoCanManageSpaces,
  setDemoCanManageSpaces,
  demoIsTrial,
  setDemoIsTrial,
  demoHideFullCallout,
  setDemoHideFullCallout,
  onResetToClassic,
}) => {
  const services = useDiscoverServices();
  const [isDismissed, setIsDismissed] = useState(false);
  const [showTourModal, setShowTourModal] = useState(false);

  // Demo state is now passed as props from DiscoverLayout

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

  // Check if we should show the tour modal (after switching from cue)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const showTour = urlParams.get('showObservabilityTour');

    if (showTour === 'true' && solutionType === 'oblt') {
      // Check if user has dismissed this modal before
      const hasDismissed = localStorage.getItem(STORAGE_KEY) === '1';
      if (!hasDismissed) {
        setShowTourModal(true);
      }
      // Clean up the URL parameter after showing the modal
      setTimeout(() => {
        urlParams.delete('showObservabilityTour');
        const newUrl = `${window.location.pathname}${
          urlParams.toString() ? '?' + urlParams.toString() : ''
        }`;
        window.history.replaceState({}, '', newUrl);
      }, 100);
    }
  }, [solutionType]);

  // Probe for APM data (span OR transaction) and logs data
  const { hasApmData, hasLogsData, isLoading } = useMainPageObservabilityProbe();

  // Check if user can manage spaces (with demo override)
  const canManageSpaces =
    demoCanManageSpaces && (services.application.capabilities.spaces?.manage ?? false);

  // Check if current license is a trial (with demo override)
  const isTrial = demoIsTrial || services.licensing?.license?.type === 'trial';

  // Get conditional callout message based on trial status
  const getCalloutMessage = () => {
    if (isTrial) {
      return 'Explore APM analytics — see latency, throughput, and error rates.';
    } else {
      return 'Unlock APM analytics for everyone in this space.';
    }
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

      console.log('Setting URL parameter:', currentUrl.toString());

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

  // Reset to Classic is now handled by DiscoverLayout

  const handleDismiss = useCallback(() => {
    setIsDismissed(true);
  }, []);

  // Highlights data for the tour modal (generic APM content)
  const highlights = useMemo(
    () => [
      {
        id: 'overview',
        title: 'APM overview at a glance',
        blurb: 'See performance metrics, error rates, and service dependencies in one place.',
        image: services.addBasePath('/plugins/discover/assets/highlight-span.png'),
        alt: 'Observability view with APM overview dashboard.',
      },
      {
        id: 'traces',
        title: 'Trace analysis and correlation',
        blurb: 'Follow request flows across services and identify performance bottlenecks.',
        image: services.addBasePath('/plugins/discover/assets/highlight-trace.png'),
        alt: 'Observability view showing trace waterfall and service map.',
      },
      {
        id: 'alerts',
        title: 'Proactive monitoring and alerts',
        blurb: 'Set up alerts for performance thresholds and get notified of issues early.',
        image: services.addBasePath('/plugins/discover/assets/highlight-pivot.png'),
        alt: 'Observability view with alerting and monitoring dashboards.',
      },
    ],
    [services.addBasePath]
  );

  // Don't render the callout if:
  // - We're in Observability solution (not Classic)
  // - No APM or logs data detected
  // - Still loading
  // - User dismissed the cue
  // - User cannot manage spaces
  // - Full callout is hidden (for demo purposes)
  const shouldRenderCallout =
    solutionType !== 'oblt' &&
    (hasApmData || hasLogsData) &&
    !isLoading &&
    !isDismissed &&
    canManageSpaces &&
    !demoHideFullCallout;



  return (
    <>
      {/* Only render the callout in Classic view */}
      {shouldRenderCallout && (
        // Full variant for main Discover view
        <EuiCallOut
          size="s"
          color="success"
          title={
            <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiFlexGroup alignItems="center" justifyContent="flexStart" gutterSize="s">
                  <EuiFlexItem grow={false}>
                    <EuiIcon color="success" type="apmApp" />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <span>
                      <strong>
                        {hasApmData && hasLogsData ? 'APM and logs data detected' :
                         hasApmData ? 'APM data detected' :
                         hasLogsData ? 'Logs data detected' : 'Data detected'}
                      </strong>. {getCalloutMessage()}
                    </span>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFlexGroup alignItems="center" justifyContent="flexEnd" gutterSize="s">
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty
                      color="success"
                      onClick={handleDismiss}
                      aria-label="Dismiss"
                      size="s"
                    >
                      Maybe later
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      onClick={handleSwitchToObservability}
                      data-test-subj="obsMainPageCueSwitchBtn"
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
          }
        />
      )}

      {/* Tour Modal - render regardless of solution type */}
      <ObservabilityTourModal
        isOpen={showTourModal}
        onClose={() => setShowTourModal(false)}
        title="Discover more with APM"
        subtitle="Explore these APM-focused enhancements in Observability:"
        highlights={highlights}
        storageKey={STORAGE_KEY}
        testSubj="obsMainPageModalCloseBtn"
      />

      {/* Demo Bar is now rendered in DiscoverLayout */}
    </>
  );
};
