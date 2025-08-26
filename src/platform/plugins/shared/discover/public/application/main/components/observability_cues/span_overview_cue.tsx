/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License v 1".
 */

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
  EuiLink,
  EuiFlexGroup,
  EuiFlexItem,
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiButtonEmpty,
  EuiTitle,
  EuiText,
  EuiListGroup,
  EuiListGroupItem,
  EuiPanel,
  EuiImage,
  EuiSwitch,
  EuiPagination,
  EuiSpacer,
  EuiButtonIcon,
} from '@elastic/eui';
import { css } from '@emotion/react';
import useObservable from 'react-use/lib/useObservable';
import { of } from 'rxjs';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { useAppStateSelector } from '../../state_management/discover_app_state_container';
import { useSpanOverviewProbe } from './use_span_overview_probe';
import { SPAN_OVERVIEW_CUE_FEATURE_FLAG_KEY } from '../../../../constants';

const STORAGE_KEY = 'obs_traces_modal_dismissed';

interface SpanOverviewCueProps {
  className?: string;
}

export const SpanOverviewCue: React.FC<SpanOverviewCueProps> = ({ className }) => {
  const services = useDiscoverServices();
  const { hasSpanData, isLoading } = useSpanOverviewProbe();
  const [isDismissed, setIsDismissed] = useState(false);
  const [showTourModal, setShowTourModal] = useState(false);
  const [selectedHighlight, setSelectedHighlight] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  // Get current Discover state for navigation
  const dataViewId = useAppStateSelector((state) => state.dataSource?.dataViewId);
  const query = useAppStateSelector((state) => state.query);
  const filters = useAppStateSelector((state) => state.filters);
  const timeRange = useAppStateSelector((state) => state.time);

  // Get current solution type using the same approach as the SolutionsViewBadge
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

  const handleSwitchToObservability = useCallback(async () => {
    try {
      // Get current active space
      const activeSpace = await services.spaces?.getActiveSpace();
      if (!activeSpace) {
        console.warn('Could not get active space');
        return;
      }

      // Update the space with Observability solution view
      const updatedSpace = {
        ...activeSpace,
        solution: 'oblt' as const,
      };

      // Make API call to update the space
      await services.http.put(`/api/spaces/space/${encodeURIComponent(activeSpace.id)}`, {
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

  const handleDismiss = useCallback(() => {
    setIsDismissed(true);
  }, []);

  const handleInfoLinkClick = useCallback(() => {
    // No telemetry for now
  }, []);

  // Check if feature flag is enabled
  const isFeatureEnabled = services.core.featureFlags.getBooleanValue(
    SPAN_OVERVIEW_CUE_FEATURE_FLAG_KEY,
    true
  );

  // Highlights data for the tour modal
  const highlights = useMemo(
    () => [
      {
        id: 'span',
        title: 'Span overview at a glance',
        blurb: "See a mini waterfall of parent and child spans in Discover's flyout.",
        color: '#006BB4', // EUI blue
        alt: 'Discover flyout with Span overview tab and mini waterfall.',
      },
      {
        id: 'txn',
        title: 'Transaction & Error details',
        blurb: 'Get rich context for request flow and exceptions with dedicated tabs.',
        color: '#00BFB3', // EUI teal
        alt: 'Discover flyout with Transaction overview tab highlighted.',
      },
      {
        id: 'corr',
        title: 'Seamless trace correlation',
        blurb: 'Pivot from spans to related logs and metrics for end-to-end visibility.',
        color: '#6B73C7', // EUI purple
        alt: 'Discover flyout showing link to related logs/metrics.',
      },
    ],
    []
  );

  // Navigation helpers
  const onPrev = useCallback(() => {
    setSelectedHighlight((s) => (s + highlights.length - 1) % highlights.length);
  }, [highlights.length]);

  const onNext = useCallback(() => {
    setSelectedHighlight((s) => (s + 1) % highlights.length);
  }, [highlights.length]);

  const onFinish = useCallback(() => {
    if (dontShowAgain) {
      localStorage.setItem(STORAGE_KEY, '1');
    }
    setShowTourModal(false);
  }, [dontShowAgain]);

  // Don't render the callout if:
  // - Feature flag is disabled
  // - We're in Observability solution (not Classic)
  // - No span data detected
  // - Still loading
  // - User dismissed the cue
  const shouldRenderCallout =
    isFeatureEnabled && solutionType !== 'oblt' && hasSpanData && !isLoading && !isDismissed;

  return (
    <>
      {/* Only render the callout in Classic view */}
      {shouldRenderCallout && (
        <EuiCallOut
          iconType="apmApp"
          title="Trace/span data detected."
          color="primary"
          className={className}
          onDismiss={handleDismiss}
        >
          <p>Switch to Observability to see the Span overview and mini waterfall.</p>
          <EuiFlexGroup gutterSize="l" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButton
                onClick={handleSwitchToObservability}
                data-test-subj="obsSpanCueSwitchBtn"
                size="s"
                fill
              >
                Switch to Observability
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiLink
                href="https://elastic.co/guide/observability/discover/span-overview"
                target="_blank"
                onClick={handleInfoLinkClick}
                data-test-subj="obsSpanCueInfoLink"
              >
                Why am I seeing this?
              </EuiLink>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiCallOut>
      )}

      {/* Tour Modal - render regardless of solution type */}
      {showTourModal && (
        <EuiModal onClose={() => setShowTourModal(false)} style={{ maxWidth: 920 }}>
          <EuiModalHeader>
            <EuiModalHeaderTitle>Discover more with Traces</EuiModalHeaderTitle>
          </EuiModalHeader>

          <EuiModalBody>
            <EuiFlexGroup gutterSize="l" responsive>
              <EuiFlexItem grow={1}>
                <EuiText color="subdued" size="s">
                  <p>Explore these trace-focused enhancements in Observability:</p>
                </EuiText>
                <EuiSpacer size="m" />
                <EuiListGroup>
                  {highlights.map((h, i) => (
                    <EuiListGroupItem
                      key={h.id}
                      label={
                        <div>
                          <strong>{h.title}</strong>
                          <EuiText size="s" color="subdued">
                            <p style={{ margin: 0 }}>{h.blurb}</p>
                          </EuiText>
                        </div>
                      }
                      isActive={selectedHighlight === i}
                      onClick={() => setSelectedHighlight(i)}
                      size="s"
                      wrapText
                    />
                  ))}
                </EuiListGroup>

                <EuiFlexGroup
                  gutterSize="s"
                  alignItems="center"
                  responsive={false}
                  style={{ marginTop: 12 }}
                  justifyContent="flexStart"
                >
                  <EuiFlexItem grow={false}>
                    <EuiButtonIcon
                      iconType="arrowLeft"
                      onClick={onPrev}
                      aria-label="Previous highlight"
                    />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButtonIcon
                      iconType="arrowRight"
                      onClick={onNext}
                      aria-label="Next highlight"
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiSpacer />
                <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
                  <EuiFlexItem grow={false}>
                    <EuiSwitch
                      label="Don't show again"
                      checked={dontShowAgain}
                      onChange={(e) => setDontShowAgain(e.target.checked)}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      size="s"
                      fill
                      onClick={onFinish}
                      data-test-subj="obsTracesModalCloseBtn"
                    >
                      Got it
                    </EuiButton>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>

              <EuiFlexItem grow={1}>
                <EuiPanel paddingSize="none" hasShadow>
                  <div
                    style={{
                      width: '100%',
                      height: '300px',
                      backgroundColor: highlights[selectedHighlight].color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      textAlign: 'center',
                      padding: '20px',
                    }}
                  >
                    {highlights[selectedHighlight].title}
                    <br />
                    <span style={{ fontSize: '14px', fontWeight: 'normal', marginTop: '8px' }}>
                      (Placeholder for {highlights[selectedHighlight].id} screenshot)
                    </span>
                  </div>
                </EuiPanel>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiModalBody>
        </EuiModal>
      )}
    </>
  );
};
