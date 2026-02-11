/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  EuiFormFieldset,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiTitle,
  EuiText,
  EuiIconTip,
} from '@elastic/eui';
import { action } from '@storybook/addon-actions';
import type { Meta, StoryFn } from '@storybook/react';
import { Template } from '../../mocks/src/storybook_template';
import {
  BadComponent,
  createServicesWithAnalyticsMock,
  Spacer,
  DocsBlock,
  StoryActionButton,
} from '../../mocks';

import mdx from '../../README.mdx';
import { KibanaErrorBoundaryDepsProvider } from '../services/error_boundary_provider';
import {
  DEFAULT_MAX_ERROR_DURATION_MS,
  TRANSIENT_NAVIGATION_WINDOW_MS,
} from '../services/error_service';
import { KibanaErrorBoundary } from './error_boundary';
import { KibanaSectionErrorBoundary } from './section_error_boundary';

export default {
  title: 'Errors/Fatal Errors',
  description:
    'This is the Kibana Error Boundary. Use this to put a boundary around React components that may throw errors when rendering. It will intercept the error and determine if it is fatal or recoverable.\n\nIn these stories we demonstrate the new telemetry fields: `component_render_min_duration_ms` and `has_transient_navigation`. You can observe reported telemetry in Storybook\'s Actions tab ("Report telemetry event").',
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

export const TransientError: StoryFn = () => {
  const { services } = createServicesWithAnalyticsMock();

  // Start with boundary NOT mounted so the embedded "Throw error" button is not visible outside cards
  const [showBoundary, setShowBoundary] = useState(false);
  const startRef = useRef<number>(0);
  const navTimeoutRef = useRef<number | null>(null);
  const unmountTimeoutRef = useRef<number | null>(null);
  const logUnmount = useMemo(() => action('Unmounted error boundary'), []);

  useEffect(() => {
    return () => {
      if (navTimeoutRef.current) window.clearTimeout(navTimeoutRef.current);
      if (unmountTimeoutRef.current) window.clearTimeout(unmountTimeoutRef.current);
    };
  }, []);

  const clearTimers = useCallback(() => {
    if (navTimeoutRef.current) window.clearTimeout(navTimeoutRef.current);
    if (unmountTimeoutRef.current) window.clearTimeout(unmountTimeoutRef.current);
    navTimeoutRef.current = null;
    unmountTimeoutRef.current = null;
  }, []);

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

  const scheduleNavigation = useCallback((delayMs: number) => {
    if (navTimeoutRef.current) window.clearTimeout(navTimeoutRef.current);
    navTimeoutRef.current = window.setTimeout(() => {
      const newPath = `/storybook-nav-${Date.now()}`;
      window.history.pushState({}, '', newPath);
      setShowBoundary((v) => v);
    }, delayMs);
  }, []);

  const scheduleUnmount = useCallback(
    (delayMs: number) => {
      if (unmountTimeoutRef.current) window.clearTimeout(unmountTimeoutRef.current);
      const plannedAt = Date.now();
      unmountTimeoutRef.current = window.setTimeout(() => {
        setShowBoundary(false);
        const startAt = startRef.current || plannedAt;
        const elapsed = Date.now() - startAt;
        logUnmount({ plannedDelayMs: delayMs, elapsedMs: elapsed });
        // Remount to allow repeated runs
        window.setTimeout(() => setShowBoundary(true), 0);
      }, delayMs);
    },
    [logUnmount]
  );

  const runScenario = useCallback(
    ({
      unmountDelayMs,
      withNav,
      navAfterWindow,
    }: {
      unmountDelayMs: number;
      withNav?: boolean;
      // if true, schedule nav after TRANSIENT_NAVIGATION_WINDOW_MS, else schedule close to unmount
      navAfterWindow?: boolean;
    }) => {
      // Do not clear any telemetry storage here; events are visible in Storybook Actions
      clearTimers();
      if (!showBoundary) setShowBoundary(true);
      startRef.current = Date.now();
      window.setTimeout(() => {
        clickErrorButton();
        if (withNav) {
          let navDelay = Math.max(0, unmountDelayMs - 20);
          if (navAfterWindow) {
            navDelay = Math.min(
              Math.max(TRANSIENT_NAVIGATION_WINDOW_MS + 10, 0),
              Math.max(0, unmountDelayMs - 20)
            );
          }
          scheduleNavigation(navDelay);
        }
        scheduleUnmount(unmountDelayMs);
      }, 0);
    },
    [showBoundary, clearTimers, clickErrorButton, scheduleNavigation, scheduleUnmount]
  );

  // Manual flows
  const [manualMode, setManualMode] = useState<'none' | 'plain' | 'nav'>('none');

  const startManual = useCallback(
    (mode: 'plain' | 'nav') => {
      // Do not clear any telemetry storage here; events are visible in Storybook Actions
      clearTimers();
      if (!showBoundary) setShowBoundary(true);
      startRef.current = Date.now();
      setManualMode(mode);
      window.setTimeout(() => {
        clickErrorButton();
      }, 0);
    },
    [clearTimers, showBoundary, clickErrorButton]
  );

  const manualUnmount = useCallback(() => {
    if (manualMode === 'nav') {
      // Navigate just before unmount
      scheduleNavigation(0);
      window.setTimeout(() => {
        setShowBoundary(false);
        const elapsed = Date.now() - startRef.current;
        logUnmount({ plannedDelayMs: 'manual+nav', elapsedMs: elapsed });
        window.setTimeout(() => setShowBoundary(true), 0);
        setManualMode('none');
      }, 20);
    } else if (manualMode === 'plain') {
      setShowBoundary(false);
      const elapsed = Date.now() - startRef.current;
      logUnmount({ plannedDelayMs: 'manual', elapsedMs: elapsed });
      window.setTimeout(() => setShowBoundary(true), 0);
      setManualMode('none');
    }
  }, [manualMode, scheduleNavigation, logUnmount]);

  return (
    <Template>
      <KibanaErrorBoundaryDepsProvider {...services}>
        <DocsBlock title="Background">
          <div>
            Here a &quot;Transient Error&quot; is as an error that self-resolves quickly, often
            following a navigation, where user may not even visually notice the error.
            <br />
            <br />
            When an unrecoverable error is thrown, Error Boundary waits for at least{' '}
            <code>TRANSIENT_NAVIGATION_WINDOW_MS</code> ({TRANSIENT_NAVIGATION_WINDOW_MS}ms) to
            capture any transient navigation. It then reports telemetry including{' '}
            <code>has_transient_navigation</code> and <code>component_render_min_duration_ms</code>.
            If no user interaction occurs, the error auto-commits after{' '}
            <code>DEFAULT_MAX_ERROR_DURATION_MS</code> ({DEFAULT_MAX_ERROR_DURATION_MS}ms).
          </div>
          <ul style={{ listStyleType: 'circle', paddingLeft: '1.5em' }}>
            <li>
              <strong>
                <code>component_render_min_duration_ms</code>
              </strong>
              : records how long the error component stayed rendered. Helpful to identify
              short-lived momentary errors that users may not have seen.
            </li>
            <li>
              <strong>
                <code>has_transient_navigation</code>
              </strong>
              : true if a navigation occurred within the first{' '}
              <code>TRANSIENT_NAVIGATION_WINDOW_MS</code> after error occurred. Helps identify
              transient errors followed possibly by a successful navigation.
            </li>
          </ul>
        </DocsBlock>

        <DocsBlock title="Behavior">
          <div>
            Use the scenarios below to simulate short-lived vs longer errors and with/without
            navigation inside the transient window. Each scenario mounts a boundary, throws, and
            then unmounts per its plan so you can observe timings and navigation classification.
            <br />
            <br />
            <b>Note</b> reported events can be observed in Storybook&apos;s <strong>Actions</strong>{' '}
            tab (watch the log entry &quot;Report telemetry event&quot;).
          </div>
        </DocsBlock>

        <Spacer />

        <EuiFlexGroup gutterSize="m" wrap>
          <EuiFlexItem grow={1} style={{ minWidth: 280 }}>
            <EuiPanel>
              <EuiTitle size="xs">
                <h3>100ms</h3>
              </EuiTitle>
              <EuiText size="s">
                <p>
                  Auto unmount after 100ms. No navigation. Expected: has_transient_navigation =
                  false.
                </p>
              </EuiText>
              <StoryActionButton onClick={() => runScenario({ unmountDelayMs: 100 })}>
                Run 100ms
              </StoryActionButton>
              <span style={{ marginLeft: 8 }}>
                ?
                <EuiIconTip
                  content={
                    <span>
                      <strong>Telemetry expectation</strong>:<br />
                      <code>component_render_min_duration_ms</code> ≈ <strong>100ms</strong>
                      (actual render time until unmount). Reporting may still wait for the
                      <code> TRANSIENT_NAVIGATION_WINDOW_MS</code>, but this metric reflects the
                      component’s own lifetime. <code>has_transient_navigation</code> ={' '}
                      <strong>false</strong> (no navigation occurred).
                    </span>
                  }
                  position="right"
                  type="questionInCircle"
                />
              </span>
            </EuiPanel>
          </EuiFlexItem>

          <EuiFlexItem grow={1} style={{ minWidth: 280 }}>
            <EuiPanel>
              <EuiTitle size="xs">
                <h3>With Nav 100ms</h3>
              </EuiTitle>
              <EuiText size="s">
                <p>
                  Navigate just before unmount (within 100ms). Expected: has_transient_navigation =
                  true.
                </p>
              </EuiText>
              <StoryActionButton
                onClick={() => runScenario({ unmountDelayMs: 100, withNav: true })}
              >
                Run 100ms + Nav
              </StoryActionButton>
              <span style={{ marginLeft: 8 }}>
                ?
                <EuiIconTip
                  content={
                    <span>
                      <strong>Telemetry expectation</strong>:<br />
                      <code>component_render_min_duration_ms</code> ≈ <strong>100ms</strong>
                      (actual render time until unmount). A navigation occurs within the transient
                      window, so <code>has_transient_navigation</code> = <strong>true</strong>.
                    </span>
                  }
                  position="right"
                  type="questionInCircle"
                />
              </span>
            </EuiPanel>
          </EuiFlexItem>

          <EuiFlexItem grow={1} style={{ minWidth: 280 }}>
            <EuiPanel>
              <EuiTitle size="xs">
                <h3>400ms</h3>
              </EuiTitle>
              <EuiText size="s">
                <p>
                  Auto unmount after 400ms. No navigation. Expected: has_transient_navigation =
                  false.
                </p>
              </EuiText>
              <StoryActionButton onClick={() => runScenario({ unmountDelayMs: 400 })}>
                Run 400ms
              </StoryActionButton>
              <span style={{ marginLeft: 8 }}>
                ?
                <EuiIconTip
                  content={
                    <span>
                      <strong>Telemetry expectation</strong>:<br />
                      <code>component_render_min_duration_ms</code> ≈ <strong>400ms</strong>
                      (actual render time). No navigation takes place, so{' '}
                      <code>has_transient_navigation</code> = <strong>false</strong>.
                    </span>
                  }
                  position="right"
                  type="questionInCircle"
                />
              </span>
            </EuiPanel>
          </EuiFlexItem>

          <EuiFlexItem grow={1} style={{ minWidth: 280 }}>
            <EuiPanel>
              <EuiTitle size="xs">
                <h3>With Nav 400ms</h3>
              </EuiTitle>
              <EuiText size="s">
                <p>
                  Navigate after <code>TRANSIENT_NAVIGATION_WINDOW_MS</code> and before unmount.
                  Expected: has_transient_navigation = false.
                </p>
              </EuiText>
              <StoryActionButton
                onClick={() =>
                  runScenario({ unmountDelayMs: 400, withNav: true, navAfterWindow: true })
                }
              >
                Run 400ms + Nav (after window)
              </StoryActionButton>
              <span style={{ marginLeft: 8 }}>
                ?
                <EuiIconTip
                  content={
                    <span>
                      <strong>Telemetry expectation</strong>:<br />
                      <code>component_render_min_duration_ms</code> ≈ <strong>400ms</strong>
                      (actual render time). Navigation occurs <em>after</em> the transient window,
                      so <code>has_transient_navigation</code> = <strong>false</strong>.
                    </span>
                  }
                  position="right"
                  type="questionInCircle"
                />
              </span>
            </EuiPanel>
          </EuiFlexItem>

          <EuiFlexItem grow={1} style={{ minWidth: 280 }}>
            <EuiPanel>
              <EuiTitle size="xs">
                <h3>Manual</h3>
              </EuiTitle>
              <EuiText size="s">
                <p>Throw and manually unmount when ready. No navigation.</p>
              </EuiText>
              {manualMode !== 'plain' ? (
                <StoryActionButton onClick={() => startManual('plain')}>
                  Throw (manual)
                </StoryActionButton>
              ) : (
                <StoryActionButton color="primary" onClick={manualUnmount}>
                  Unmount now
                </StoryActionButton>
              )}
              <span style={{ marginLeft: 8 }}>
                ?
                <EuiIconTip
                  content={
                    <span>
                      <strong>Telemetry expectation</strong>:<br />
                      <code>component_render_min_duration_ms</code> equals the time until you click{' '}
                      <em>Unmount now</em> (the component’s actual render duration). Unless you
                      navigate, <code>has_transient_navigation</code> will be <strong>false</strong>
                      . Reporting may still wait out the transient window, but the duration reflects
                      the component’s lifetime.
                    </span>
                  }
                  position="right"
                  type="questionInCircle"
                />
              </span>
            </EuiPanel>
          </EuiFlexItem>

          <EuiFlexItem grow={1} style={{ minWidth: 280 }}>
            <EuiPanel>
              <EuiTitle size="xs">
                <h3>Manual Nav</h3>
              </EuiTitle>
              <EuiText size="s">
                <p>Throw and unmount with a navigation just before unmounting.</p>
              </EuiText>
              {manualMode !== 'nav' ? (
                <StoryActionButton onClick={() => startManual('nav')}>
                  Throw (manual + nav)
                </StoryActionButton>
              ) : (
                <StoryActionButton color="primary" onClick={manualUnmount}>
                  Unmount with Nav
                </StoryActionButton>
              )}
              <span style={{ marginLeft: 8 }}>
                ?
                <EuiIconTip
                  content={
                    <span>
                      <strong>Telemetry expectation</strong>:<br />
                      The duration equals the time until you unmount. If you click
                      <em> Unmount with Nav</em> quickly after throwing, the navigation occurs
                      within <code>TRANSIENT_NAVIGATION_WINDOW_MS</code> and{' '}
                      <code>has_transient_navigation</code> will be <strong>true</strong>. Waiting
                      longer makes it <strong>false</strong>.
                    </span>
                  }
                  position="right"
                  type="questionInCircle"
                />
              </span>
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGroup>

        <Spacer />

        {showBoundary && (
          <KibanaErrorBoundary>
            <BadComponent />
          </KibanaErrorBoundary>
        )}
      </KibanaErrorBoundaryDepsProvider>
    </Template>
  );
};
