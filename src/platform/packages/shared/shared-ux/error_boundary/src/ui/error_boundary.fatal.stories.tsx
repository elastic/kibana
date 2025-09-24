/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EuiFormFieldset } from '@elastic/eui';
import { action } from '@storybook/addon-actions';
import type { Meta, StoryFn } from '@storybook/react';
import { Template } from '../../mocks/src/storybook_template';
import {
  BadComponent,
  createServicesWithAnalyticsMock,
  Spacer,
  TelemetryEventsPanel,
  DocsBlock,
  StoryActionButton,
} from '../../mocks';

import mdx from '../../README.mdx';
import { KibanaErrorBoundaryDepsProvider } from '../services/error_boundary_provider';
import {
  DEFAULT_MAX_ERROR_DURATION_MS,
  MONITOR_NAVIGATION_WITHIN_MS,
} from '../services/error_service';
import { KibanaErrorBoundary } from './error_boundary';
import { KibanaSectionErrorBoundary } from './section_error_boundary';

export default {
  title: 'Errors/Fatal Errors',
  description:
    'This is the Kibana Error Boundary. Use this to put a boundary around React components that may throw errors when rendering. It will intercept the error and determine if it is fatal or recoverable.\n\nIn these stories we demonstrate the new telemetry fields: `component_render_min_duration_ms` and `has_subsequent_navigation`. You can observe reported telemetry via the Storybook Actions panel ("Report telemetry event") or in the in-page telemetry panel included below each story.',
  parameters: {
    docs: {
      page: mdx,
    },
  },
} as Meta;

export const ErrorInCallout: StoryFn = () => {
  const { services } = createServicesWithAnalyticsMock();

  return (
    <Template>
      <KibanaErrorBoundaryDepsProvider {...services}>
        <KibanaErrorBoundary>
          <BadComponent />
        </KibanaErrorBoundary>
      </KibanaErrorBoundaryDepsProvider>
    </Template>
  );
};

export const SectionErrorInCallout: StoryFn = () => {
  const { services } = createServicesWithAnalyticsMock();

  return (
    <Template>
      <KibanaErrorBoundaryDepsProvider {...services}>
        <EuiFormFieldset legend={{ children: 'Section A' }}>
          <KibanaSectionErrorBoundary sectionName="sectionA">
            <BadComponent />
          </KibanaSectionErrorBoundary>
        </EuiFormFieldset>
        <EuiFormFieldset legend={{ children: 'Section B' }}>
          <KibanaSectionErrorBoundary sectionName="sectionB">
            <BadComponent />
          </KibanaSectionErrorBoundary>
        </EuiFormFieldset>
      </KibanaErrorBoundaryDepsProvider>
    </Template>
  );
};

/**
 * Demonstrates has_subsequent_navigation = false
 * Steps:
 * 1) Click "Throw error" (red button)
 * 2) Click "Unmount in 400ms" (no navigation)
 * The telemetry action should log has_subsequent_navigation: false
 */
export const TransientError: StoryFn<{ unmountDelayMs: number }> = ({ unmountDelayMs }) => {
  const { services, mock } = createServicesWithAnalyticsMock();

  const [showBoundary, setShowBoundary] = useState(true);
  const startRef = useRef<number>(0);
  const [remainingMs, setRemainingMs] = useState(DEFAULT_MAX_ERROR_DURATION_MS);
  const unmountTimeoutRef = useRef<number | null>(null);
  const logUnmount = useMemo(() => action('Unmounted error boundary'), []);

  useEffect(() => {
    return () => {
      if (unmountTimeoutRef.current) window.clearTimeout(unmountTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (!startRef.current) return;
      const elapsed = Date.now() - startRef.current;
      setRemainingMs(Math.max(0, DEFAULT_MAX_ERROR_DURATION_MS - elapsed));
    }, 200);
    return () => window.clearInterval(id);
  }, []);

  // Start countdown when the internal BadComponent throw button is clicked manually
  useEffect(() => {
    const btn = document.querySelector(
      '[data-test-subj="clickForErrorBtn"]'
    ) as HTMLButtonElement | null;
    if (!btn) return;
    const handler = () => {
      startRef.current = Date.now();
    };
    btn.addEventListener('click', handler);
    return () => btn.removeEventListener('click', handler);
  }, [showBoundary]);

  const clickErrorButton = useCallback(() => {
    const btn = document.querySelector(
      '[data-test-subj="clickForErrorBtn"]'
    ) as HTMLButtonElement | null;
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  }, []);

  const throwAndUnmount200ms = useCallback(() => {
    // Reset countdown and boundary
    startRef.current = Date.now();
    setShowBoundary(false);
    window.setTimeout(() => setShowBoundary(true), 0);
    // Ensure button is clickable after mount
    window.setTimeout(() => {
      clickErrorButton();
      if (unmountTimeoutRef.current) window.clearTimeout(unmountTimeoutRef.current);
      unmountTimeoutRef.current = window.setTimeout(() => {
        setShowBoundary(false);
        const elapsed = Date.now() - startRef.current;
        logUnmount({ plannedDelayMs: 200, elapsedMs: elapsed });
        // Stop countdown after unmount and reset to default for the next run
        startRef.current = 0;
        setRemainingMs(DEFAULT_MAX_ERROR_DURATION_MS);
        // Remount to allow repeated testing
        window.setTimeout(() => setShowBoundary(true), 0);
      }, 200);
    }, 0);
  }, [clickErrorButton, logUnmount]);

  const manualUnmount = useCallback(() => {
    setShowBoundary(false);
    if (startRef.current) {
      const elapsed = Date.now() - startRef.current;
      logUnmount({ plannedDelayMs: 'manual', elapsedMs: elapsed });
    }
    // Stop countdown after unmount and reset to default for the next run
    startRef.current = 0;
    setRemainingMs(DEFAULT_MAX_ERROR_DURATION_MS);
    // Remount so user can re-throw and countdown continues from last startRef
    window.setTimeout(() => setShowBoundary(true), 0);
  }, [logUnmount]);

  return (
    <Template>
      <KibanaErrorBoundaryDepsProvider {...services}>
        <DocsBlock title="Background">
          <div>
            This story focuses on <code>component_render_min_duration_ms</code> — the minimum time
            an error UI must remain mounted before we consider it &ldquo;seen&rdquo; and eligible
            for telemetry. This filtering helps suppress brief, noisy glitches and only report
            meaningful failures. If an error remains visible and the user doesn&rsquo;t interact, it
            will auto-commit after
            <code> DEFAULT_MAX_ERROR_DURATION_MS</code> ({DEFAULT_MAX_ERROR_DURATION_MS}ms). Or when
            the user reacts to the error e.g. clicks the &quot;Refresh page&quot; button or
            navigates away the error will be committed/reported (This is simulated by the
            &quot;Unmount&quot; button below).
          </div>
        </DocsBlock>
        <DocsBlock title="Behavior">
          <div>
            <ul style={{ listStyle: 'inside' }}>
              <li>
                <StoryActionButton onClick={throwAndUnmount200ms}>
                  Throw and unmount in 200ms
                </StoryActionButton>
                shows a brief error that does not get reported because 200ms is less than
                <code> MONITOR_NAVIGATION_WITHIN_MS</code> ({MONITOR_NAVIGATION_WITHIN_MS}ms).
              </li>
              <li>
                Or click the <b>Throw error</b> button below and then
                <StoryActionButton onClick={manualUnmount} disabled={!showBoundary}>
                  Unmount
                </StoryActionButton>
                when ready. If you do nothing, the error will auto-commit after
                <code> DEFAULT_MAX_ERROR_DURATION_MS</code> ({DEFAULT_MAX_ERROR_DURATION_MS}ms).
              </li>
            </ul>
            <div style={{ marginTop: 8, fontFamily: 'monospace' }}>
              Auto-commit in: ~{Math.ceil(remainingMs / 1000)}s
            </div>
          </div>
        </DocsBlock>
        <Spacer />
        {showBoundary && (
          <KibanaErrorBoundary>
            <BadComponent />
          </KibanaErrorBoundary>
        )}
        <Spacer />
        <TelemetryEventsPanel mock={mock} />
      </KibanaErrorBoundaryDepsProvider>
    </Template>
  );
};

export const TransientSectionError: StoryFn<{ unmountDelayMs: number }> = ({ unmountDelayMs }) => {
  const { services, mock } = createServicesWithAnalyticsMock();

  const [showBoundary, setShowBoundary] = useState(true);
  const startRef = useRef<number>(0);
  const [remainingMs, setRemainingMs] = useState(DEFAULT_MAX_ERROR_DURATION_MS);
  const unmountTimeoutRef = useRef<number | null>(null);
  const logUnmount = useMemo(() => action('Unmounted section error boundary'), []);

  useEffect(() => {
    return () => {
      if (unmountTimeoutRef.current) window.clearTimeout(unmountTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (!startRef.current) return;
      const elapsed = Date.now() - startRef.current;
      setRemainingMs(Math.max(0, DEFAULT_MAX_ERROR_DURATION_MS - elapsed));
    }, 200);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const btn = document.querySelector(
      '[data-test-subj="clickForErrorBtn"]'
    ) as HTMLButtonElement | null;
    if (!btn) return;
    const handler = () => {
      startRef.current = Date.now();
    };
    btn.addEventListener('click', handler);
    return () => btn.removeEventListener('click', handler);
  }, [showBoundary]);

  const clickErrorButton = useCallback(() => {
    const btn = document.querySelector(
      '[data-test-subj="clickForErrorBtn"]'
    ) as HTMLButtonElement | null;
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  }, []);

  const throwAndUnmount200ms = useCallback(() => {
    startRef.current = Date.now();
    setShowBoundary(false);
    window.setTimeout(() => setShowBoundary(true), 0);
    window.setTimeout(() => {
      clickErrorButton();
      if (unmountTimeoutRef.current) window.clearTimeout(unmountTimeoutRef.current);
      unmountTimeoutRef.current = window.setTimeout(() => {
        setShowBoundary(false);
        const elapsed = Date.now() - startRef.current;
        logUnmount({ plannedDelayMs: 200, elapsedMs: elapsed });
        startRef.current = 0;
        setRemainingMs(DEFAULT_MAX_ERROR_DURATION_MS);
        window.setTimeout(() => setShowBoundary(true), 0);
      }, 200);
    }, 0);
  }, [clickErrorButton, logUnmount]);

  const manualUnmount = useCallback(() => {
    setShowBoundary(false);
    if (startRef.current) {
      const elapsed = Date.now() - startRef.current;
      logUnmount({ plannedDelayMs: 'manual', elapsedMs: elapsed });
    }
    startRef.current = 0;
    setRemainingMs(DEFAULT_MAX_ERROR_DURATION_MS);
    window.setTimeout(() => setShowBoundary(true), 0);
  }, [logUnmount]);

  return (
    <Template>
      <KibanaErrorBoundaryDepsProvider {...services}>
        <EuiFormFieldset legend={{ children: 'Section A' }}>
          <DocsBlock title="Behavior">
            <div>
              <ul style={{ listStyle: 'inside' }}>
                <li>
                  <StoryActionButton onClick={throwAndUnmount200ms}>
                    Throw and unmount in 200ms
                  </StoryActionButton>
                  shows a brief error that does not get reported because 200ms is less than
                  <code> MONITOR_NAVIGATION_WITHIN_MS</code> ({MONITOR_NAVIGATION_WITHIN_MS}ms).
                </li>
                <li>
                  Or click the <b>Throw error</b> button below and then
                  <StoryActionButton onClick={manualUnmount} disabled={!showBoundary}>
                    Unmount
                  </StoryActionButton>{' '}
                  when ready. If you do nothing, the error will auto-commit after{' '}
                  <code> DEFAULT_MAX_ERROR_DURATION_MS</code> ({DEFAULT_MAX_ERROR_DURATION_MS}ms).
                </li>
              </ul>
              <div style={{ marginTop: 8, fontFamily: 'monospace' }}>
                Auto-commit in: ~{Math.ceil(remainingMs / 1000)}s
              </div>
            </div>
          </DocsBlock>
          <Spacer />
          {showBoundary && (
            <KibanaSectionErrorBoundary sectionName="sectionA">
              <BadComponent />
            </KibanaSectionErrorBoundary>
          )}
        </EuiFormFieldset>
        <Spacer />
        <TelemetryEventsPanel mock={mock} />
      </KibanaErrorBoundaryDepsProvider>
    </Template>
  );
};

/**
 * Demonstrates has_subsequent_navigation = true
 * Steps:
 * 1) Click "Throw error" (red button) to render the error UI
 * 2) Click "Navigate in 100ms"
 * 3) Click "Unmount in 400ms"
 * The telemetry action should log has_subsequent_navigation: true
 */
export const TransientErrorWithNavigation: StoryFn<{ unmountDelayMs: number }> = ({
  unmountDelayMs,
}) => {
  const { services, mock } = createServicesWithAnalyticsMock();

  const [showBoundary, setShowBoundary] = useState(true);
  const navTimeoutRef = useRef<number | null>(null);
  const unmountTimeoutRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);
  const logUnmount = useMemo(() => action('Unmounted error boundary'), []);

  useEffect(() => {
    return () => {
      if (navTimeoutRef.current) window.clearTimeout(navTimeoutRef.current);
      if (unmountTimeoutRef.current) window.clearTimeout(unmountTimeoutRef.current);
    };
  }, []);

  const scheduleNavigation = useCallback((delayMs: number) => {
    if (navTimeoutRef.current) window.clearTimeout(navTimeoutRef.current);
    navTimeoutRef.current = window.setTimeout(() => {
      const newPath = `/storybook-nav-${Date.now()}`;
      window.history.pushState({}, '', newPath);
      // trigger a small re-render to make it evident
      // (not required for the service logic which reads location directly)
      setShowBoundary((v) => v);
    }, delayMs);
  }, []);

  const scheduleUnmount = useCallback((delayMs: number) => {
    if (unmountTimeoutRef.current) window.clearTimeout(unmountTimeoutRef.current);
    const plannedAt = Date.now();
    unmountTimeoutRef.current = window.setTimeout(() => {
      setShowBoundary(false);
      const startAt = startRef.current || plannedAt;
      const elapsed = Date.now() - startAt;
      logUnmount({ plannedDelayMs: delayMs, elapsedMs: elapsed });
      // Automatically remount so the user can re-throw
      window.setTimeout(() => setShowBoundary(true), 0);
    }, delayMs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const willReport = unmountDelayMs >= MONITOR_NAVIGATION_WITHIN_MS;

  const clickErrorButton = useCallback(() => {
    const btn = document.querySelector(
      '[data-test-subj="clickForErrorBtn"]'
    ) as HTMLButtonElement | null;
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  }, []);

  const throwWithNavigation = useCallback(() => {
    // Clear previous telemetry events for a clean run
    (mock as any)?.clear?.();
    // Reset and re-render the boundary so it can throw again on repeated clicks
    if (!showBoundary) setShowBoundary(true);
    startRef.current = Date.now();
    // Wait a microtask to allow the boundary to mount before clicking the inner button
    window.setTimeout(() => {
      scheduleNavigation(100);
      clickErrorButton();
      scheduleUnmount(unmountDelayMs);
    }, 0);
  }, [mock, showBoundary, clickErrorButton, scheduleNavigation, scheduleUnmount, unmountDelayMs]);

  const throwWithoutNavigation = useCallback(() => {
    // Clear previous telemetry events for a clean run
    (mock as any)?.clear?.();
    if (!showBoundary) setShowBoundary(true);
    if (navTimeoutRef.current) window.clearTimeout(navTimeoutRef.current);
    startRef.current = Date.now();
    window.setTimeout(() => {
      clickErrorButton();
      scheduleUnmount(unmountDelayMs);
    }, 0);
  }, [mock, showBoundary, clickErrorButton, scheduleUnmount, unmountDelayMs]);

  return (
    <Template>
      <KibanaErrorBoundaryDepsProvider {...services}>
        <DocsBlock title="Background">
          <div>
            For non-recoverable errors, <code>ErrorBoundary</code> reports two important metrics,{' '}
            <code>has_subsequent_navigation</code> and <code>component_render_min_duration_ms</code>
            .
            <ul style={{ listStyle: 'inside' }}>
              <li>
                <code>
                  <strong>component_render_min_duration_ms</strong>
                </code>{' '}
                measures the time from when the erroring component started rendering to when the
                error UI was displayed. This helps identify components that fail quickly versus
                those that render for a long time before failing. The metric helps identify whether
                the user has visually observed the error.
              </li>
              <li>
                <code>
                  <strong>has_subsequent_navigation</strong>
                </code>{' '}
                indicates whether a navigation occurred during the first{' '}
                <code>{MONITOR_NAVIGATION_WITHIN_MS}ms</code> (
                <code>MONITOR_NAVIGATION_WITHIN_MS</code>) after the error rendered. This helps
                identify transient errors that may be related to navigation or network issues.
              </li>
            </ul>
          </div>
        </DocsBlock>

        <DocsBlock title="Behavior">
          <div>
            <ul style={{ listStyle: 'inside' }}>
              <li>
                Click{' '}
                <StoryActionButton onClick={throwWithNavigation}>
                  Throw with Navigation
                </StoryActionButton>
                to throw a fatal error caught by Error Boundary, and trigger a navigation after
                100ms via
                <code> window.history.pushState </code>.
              </li>
              <li>
                Click{' '}
                <StoryActionButton onClick={throwWithoutNavigation}>
                  Throw without Navigation
                </StoryActionButton>
                to throw a fatal error with no subsequent navigation.
              </li>
            </ul>
            <div style={{ marginTop: 8 }}>
              The Error Boundary component will automatically unmount after
              <strong> {unmountDelayMs}ms</strong>. It must stay rendered for at least{' '}
              <code>MONITOR_NAVIGATION_WITHIN_MS</code> ({MONITOR_NAVIGATION_WITHIN_MS}ms) to report
              the error. Any less duration is considered transient and will not be reported.
              Experiment with unmount duration in the Storybook <strong>Controls</strong> tab to see
              if reporting occurs.
              <br />
              <br />
              You can examine the telemetry event in the Storybook <strong>Actions</strong> panel or
              below.
            </div>
            <div style={{ marginTop: 8, fontFamily: 'monospace' }}>
              Will telemetry event be reported: {willReport ? 'Yes' : 'No'} (unmount in{' '}
              {unmountDelayMs}ms)
            </div>
          </div>
        </DocsBlock>
        <Spacer />
        {showBoundary && (
          <KibanaErrorBoundary>
            <BadComponent />
          </KibanaErrorBoundary>
        )}
        <TelemetryEventsPanel mock={mock} />
      </KibanaErrorBoundaryDepsProvider>
    </Template>
  );
};

// Ensure default control value when the story loads
TransientErrorWithNavigation.args = { unmountDelayMs: 400 };
TransientErrorWithNavigation.argTypes = {
  unmountDelayMs: {
    name: 'Unmount after (ms)',
    control: { type: 'range', min: 100, max: 4000, step: 100 },
  },
};
