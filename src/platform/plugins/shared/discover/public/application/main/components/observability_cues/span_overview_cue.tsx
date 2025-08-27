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
  EuiText,
  EuiListGroup,
  EuiListGroupItem,
  EuiImage,
  EuiSwitch,
  EuiSpacer,
  EuiButtonIcon,
  EuiPanel,
  EuiTitle,
  EuiIcon,
  EuiButtonEmpty,
} from '@elastic/eui';
import useObservable from 'react-use/lib/useObservable';
import { of } from 'rxjs';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { useAppStateSelector } from '../../state_management/discover_app_state_container';
import { useSpanOverviewProbe } from './use_span_overview_probe';
import { SPAN_OVERVIEW_CUE_FEATURE_FLAG_KEY } from '../../../../constants';
import type { DataTableRecord } from '@kbn/discover-utils/types';

const STORAGE_KEY = 'obs_traces_modal_dismissed';

interface SpanOverviewCueProps {
  className?: string;
  document?: DataTableRecord; // Optional document to evaluate instead of probing
  variant?: 'full' | 'compact'; // Controls the content shown in the callout
  hideFullCallout?: boolean; // Controls whether to hide the full callout (compact still shows)
}

export const SpanOverviewCue: React.FC<SpanOverviewCueProps> = ({ className, document, variant = 'full', hideFullCallout = false }) => {
  const services = useDiscoverServices();
  const { hasSpanData: probeHasSpanData, isLoading } = useSpanOverviewProbe();
  const [isDismissed, setIsDismissed] = useState(false);
  const [showTourModal, setShowTourModal] = useState(false);
  const [selectedHighlight, setSelectedHighlight] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  // Demo toggles for demonstration purposes
  const [demoCanManageSpaces, setDemoCanManageSpaces] = useState(true);
  const [demoIsTrial, setDemoIsTrial] = useState(false);
  const [demoHideFullCallout, setDemoHideFullCallout] = useState(true);

  // Check if passed document is a span document
  const documentHasSpanData = useMemo(() => {
    if (!document) return false;
    
    const source = document.raw._source;
    const fields = document.raw.fields;
    
    // Check for required span fields
    const hasProcessorEvent = source?.processor?.event === 'span' || fields?.['processor.event']?.[0] === 'span';
    const hasTimestamp = source?.['@timestamp'] || fields?.['@timestamp']?.[0];
    const hasTraceId = source?.trace?.id || fields?.['trace.id']?.[0];
    const hasSpanId = source?.span?.id || fields?.['span.id']?.[0];
    const hasSpanDuration = source?.span?.duration?.us || fields?.['span.duration.us']?.[0];
    
    // Check for traces data stream
    const hasTracesDataStream = fields?.['data_stream.type']?.[0] === 'traces';
    const isTracesIndex = document.raw._index?.match(/^(\.ds-)?traces-/);
    
    return hasProcessorEvent && hasTimestamp && hasTraceId && hasSpanId && hasSpanDuration && hasTracesDataStream && isTracesIndex;
  }, [document]);

  // Use probe result if no document passed, otherwise use document evaluation
  const hasSpanData = document ? documentHasSpanData : probeHasSpanData;

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

  // Check if user can manage spaces (with demo override)
  const canManageSpaces =
    demoCanManageSpaces && (services.application.capabilities.spaces?.manage ?? false);

  // Check if current license is a trial (with demo override)
  const isTrial = demoIsTrial || services.licensing?.license?.type === 'trial';

  // Get conditional callout message based on trial status
  const getCalloutMessage = () => {
    if (isTrial) {
      return 'Switching to the Observability view unlocks tailored tools and workflows for your data.';
    } else {
      return 'Switching to the Observability view unlocks tailored tools and workflows for everyone in this space.';
    }
  };

  // Highlights data for the tour modal
  const highlights = useMemo(
    () => [
      {
        id: 'span',
        title: 'Span overview at a glance',
        blurb: "See a mini waterfall of parent and child spans in Discover's flyout.",
        image: services.addBasePath('/plugins/discover/assets/highlight-span.png'),
        alt: 'Discover flyout with Span overview tab and mini waterfall.',
      },
      {
        id: 'txn',
        title: 'Transaction & Error details',
        blurb: 'Get rich context for request flow and exceptions with dedicated tabs.',
        image: services.addBasePath('/plugins/discover/assets/highlight-trace.png'),
        alt: 'Discover flyout with Transaction overview tab highlighted.',
      },
      {
        id: 'corr',
        title: 'Seamless trace correlation',
        blurb: 'Pivot from spans to related logs and metrics for end-to-end visibility.',
        image: services.addBasePath('/plugins/discover/assets/highlight-pivot.png'),
        alt: 'Discover flyout showing link to related logs/metrics.',
      },
    ],
    [services.addBasePath]
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
  // - User cannot manage spaces
  // - Full callout is hidden (for demo purposes)
  const shouldRenderCallout =
    isFeatureEnabled &&
    solutionType !== 'oblt' &&
    hasSpanData &&
    !isLoading &&
    !isDismissed &&
    canManageSpaces &&
    !(demoHideFullCallout && variant === 'full');

  return (
    <>
      {/* Only render the callout in Classic view */}
      {shouldRenderCallout && (
        variant === 'compact' ? (
          // Compact variant for flyout banner
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
                        <strong>Trace data detected</strong>
                      </span>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiFlexGroup alignItems="center" justifyContent="flexEnd" gutterSize="xs">
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
                        data-test-subj="obsSpanCueSwitchBtn"
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
        ) : (
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
                        <strong>Trace data detected</strong>. {getCalloutMessage()}
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
                        data-test-subj="obsSpanCueSwitchBtn"
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
        )
      )}

      {/* Tour Modal - render regardless of solution type */}
      {showTourModal && (
        <EuiModal
          onClose={() => setShowTourModal(false)}
          style={{
            minWidth: 820,
            maxWidth: 920,
            border: 'none',
            boxShadow: 'none',
          }}
          aria-labelledby="discover-traces-modal-title"
        >
          <EuiModalHeader style={{ width: '50%' }}>
            <EuiModalHeaderTitle>Discover more with Traces</EuiModalHeaderTitle>
          </EuiModalHeader>

          <EuiModalBody
            style={{ position: 'relative', paddingRight: 0, paddingBottom: '24px', width: '50%' }}
          >
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
              justifyContent="spaceBetween"
            >
              <EuiFlexItem>
                <EuiFlexGroup justifyContent="flexStart" gutterSize="s">
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
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued">
                  <p>Change views in space settings</p>
                </EuiText>
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
                <EuiButton size="s" fill onClick={onFinish} data-test-subj="obsTracesModalCloseBtn">
                  Got it
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiModalBody>
          {/* Absolutely positioned image */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: '50%',
              height: '100%',
              overflow: 'hidden',
            }}
          >
            <EuiImage
              url={highlights[selectedHighlight].image}
              alt={highlights[selectedHighlight].alt}
              size="original"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
              }}
            />
          </div>
        </EuiModal>
      )}

      {/* Demo Bar - Floating at bottom for demonstration purposes */}
      <div
        style={{
          position: 'fixed',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          backgroundColor: '#222222',
          color: '#ffffff',
          borderRadius: '24px',
          padding: '12px 16px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          minWidth: '240px',
        }}
      >
        <EuiFlexGroup gutterSize="m" alignItems="center" justifyContent="center" responsive={false}>
          {variant === 'full' && (
            <EuiFlexItem grow={false}>
              <EuiSwitch
                label="Hide full"
                checked={demoHideFullCallout}
                onChange={(e) => setDemoHideFullCallout(e.target.checked)}
                compressed
              />
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false}>
            <EuiSwitch
              label="Can manage"
              checked={demoCanManageSpaces}
              onChange={(e) => setDemoCanManageSpaces(e.target.checked)}
              compressed
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiSwitch
              label="Is trial"
              checked={demoIsTrial}
              onChange={(e) => setDemoIsTrial(e.target.checked)}
              compressed
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    </>
  );
};
