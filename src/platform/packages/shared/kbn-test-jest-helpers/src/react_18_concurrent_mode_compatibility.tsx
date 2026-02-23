/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { format } from 'util';
import chalk from 'chalk';
import type { PropsWithChildren, ReactElement } from 'react';
import React, {
  startTransition,
  StrictMode,
  Suspense,
  useEffect,
  useLayoutEffect,
  useState,
} from 'react';
import type { RenderResult } from '@testing-library/react';
import { act, render } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

interface CheckContext {
  issues: string[];
  failOnWarnings: boolean;
  ignoreEuiInternalLeaks: boolean;
  wrap: (el: ReactElement) => ReactElement;
}

/**
 * Checks whether a resource (timer, RAF, listener) was created by EUI
 * internals or React's own event delegation system.
 */
const isEuiOrReactInternal = (stack: string): boolean =>
  /@elastic\/eui\//.test(stack) ||
  /addEventBubbleListener|listenToAllSupportedEvents|listenToNativeEvent/.test(stack);

/** Wraps an element with I18nProvider, StrictMode, and Suspense. */
const wrapWithProviders = (el: ReactElement): ReactElement => (
  <I18nProvider>
    <StrictMode>
      <Suspense fallback={null}>{el}</Suspense>
    </StrictMode>
  </I18nProvider>
);

/** Renders an element wrapped with providers. */
const safeRender = (ctx: CheckContext, el: ReactElement): RenderResult => render(ctx.wrap(el));

/** Formats console args (interpolates %s/%d/etc.) into a single clean line. */
const formatArgs = (args: unknown[]): string =>
  format(...args)
    .replace(/\s*\n\s*/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

/**
 * Captures console.error and console.warn calls, reporting them as issues.
 */
const collectErrors = (ctx: CheckContext, label: string) => {
  const errors: string[] = [];
  const warns: string[] = [];

  const errorSpy = jest.spyOn(console, 'error').mockImplementation((...args) => {
    errors.push(formatArgs(args));
  });
  const warnSpy = jest.spyOn(console, 'warn').mockImplementation((...args) => {
    warns.push(formatArgs(args));
  });

  const flush = () => {
    errorSpy.mockRestore();
    warnSpy.mockRestore();

    for (const e of errors) {
      ctx.issues.push(`${chalk.white(`[${label}]`)} ${chalk.red('error:')} ${e}`);
    }
    if (ctx.failOnWarnings) {
      for (const w of warns) {
        ctx.issues.push(`${chalk.white(`[${label}]`)} ${chalk.yellow('warn:')} ${w}`);
      }
    }
  };

  return { flush };
};

/**
 * Tracks timers (setTimeout, setInterval, requestAnimationFrame) and event
 * listeners to detect resources not cleaned up after unmount.
 * Calls through to original implementations so the component behaves normally.
 */
const detectLeakedResources = (ctx: CheckContext, label: string) => {
  const activeTimeouts = new Map<NodeJS.Timeout | number, string>();
  const activeIntervals = new Map<NodeJS.Timeout | number, string>();
  const activeRAFs = new Map<number, string>();
  const activeListeners: {
    target: EventTarget;
    type: string;
    handler: EventListenerOrEventListenerObject | null;
    stack: string;
  }[] = [];

  /**
   * Save timer originals before spying. The setInterval mock converts
   * intervals to one-shot timeouts (to avoid infinite loops with
   * jest.runAllTimers()), so we capture setTimeout/clearTimeout first
   * to prevent double-counting in the timeout tracking set.
   */
  const originalSetTimeout = globalThis.setTimeout;
  const originalClearTimeout = globalThis.clearTimeout;

  const setTimeoutSpy = jest.spyOn(window, 'setTimeout').mockImplementation((handler, ms) => {
    const id: NodeJS.Timeout = originalSetTimeout(handler, ms);
    activeTimeouts.set(id, new Error().stack ?? '');
    return id;
  });

  const clearTimeoutSpy = jest.spyOn(window, 'clearTimeout').mockImplementation((id) => {
    activeTimeouts.delete(id as NodeJS.Timeout);
    originalClearTimeout(id);
  });

  const intervalSpy = jest.spyOn(window, 'setInterval').mockImplementation((handler, ms) => {
    const id: NodeJS.Timeout = originalSetTimeout(handler, ms); // One-shot to avoid infinite loops
    activeIntervals.set(id, new Error().stack ?? '');
    return id;
  });

  const clearIntervalSpy = jest.spyOn(window, 'clearInterval').mockImplementation((id) => {
    activeIntervals.delete(id as NodeJS.Timeout);
    originalClearTimeout(id);
  });

  const hasRAF = typeof window.requestAnimationFrame === 'function';
  let rafSpy: jest.SpyInstance | undefined;
  let cancelRafSpy: jest.SpyInstance | undefined;

  if (hasRAF) {
    const originalRAF = window.requestAnimationFrame.bind(window);
    const originalCancelRAF = window.cancelAnimationFrame.bind(window);

    rafSpy = jest
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((callback: FrameRequestCallback) => {
        const id = originalRAF(callback);
        activeRAFs.set(id, new Error().stack ?? '');
        return id;
      });

    cancelRafSpy = jest.spyOn(window, 'cancelAnimationFrame').mockImplementation((id: number) => {
      activeRAFs.delete(id);
      originalCancelRAF(id);
    });
  }

  /**
   * Only track listeners on persistent global targets. React 17+ attaches
   * synthetic-event delegation listeners to the root container div — those
   * are not real leaks because they become unreachable once the container
   * is removed from the DOM. Real leaks are listeners on window, document,
   * or document.body that survive unmount.
   *
   * We spy on each target individually rather than on EventTarget.prototype
   * because in JSDOM, window has its own addEventListener that shadows the
   * prototype method.
   */
  const persistentTargets: EventTarget[] = [window, document, document.body];

  const targetSpies: jest.SpyInstance[] = [];

  for (const target of persistentTargets) {
    const originalAdd = target.addEventListener.bind(target);
    const addSpy = jest.spyOn(target as any, 'addEventListener').mockImplementation(((
      type: string,
      handler: EventListenerOrEventListenerObject | null,
      listenerOptions?: boolean | AddEventListenerOptions
    ) => {
      const stack = new Error().stack ?? '';
      activeListeners.push({ target, type, handler, stack });
      originalAdd(type, handler, listenerOptions);
    }) as any);
    targetSpies.push(addSpy);

    const originalRemove = target.removeEventListener.bind(target);
    const removeSpy = jest.spyOn(target as any, 'removeEventListener').mockImplementation(((
      type: string,
      handler: EventListenerOrEventListenerObject | null,
      listenerOptions?: boolean | EventListenerOptions
    ) => {
      const idx = activeListeners.findIndex(
        (l) => l.target === target && l.type === type && l.handler === handler
      );
      if (idx !== -1) activeListeners.splice(idx, 1);
      originalRemove(type, handler, listenerOptions);
    }) as any);
    targetSpies.push(removeSpy);
  }

  return {
    verify: () => {
      setTimeoutSpy.mockRestore();
      clearTimeoutSpy.mockRestore();
      intervalSpy.mockRestore();
      clearIntervalSpy.mockRestore();
      rafSpy?.mockRestore();
      cancelRafSpy?.mockRestore();
      for (const spy of targetSpies) {
        spy.mockRestore();
      }

      const { ignoreEuiInternalLeaks } = ctx;

      if (activeTimeouts.size > 0) {
        const reportable = ignoreEuiInternalLeaks
          ? [...activeTimeouts.values()].filter((s) => !isEuiOrReactInternal(s))
          : [...activeTimeouts.values()];
        if (reportable.length > 0) {
          ctx.issues.push(
            `${chalk.white(`[${label}]`)} ${chalk.red(
              `Leaked ${reportable.length} setTimeout(s).`
            )} Ensure all timeouts are cleared on unmount.`
          );
        }
      }

      if (activeIntervals.size > 0) {
        const reportable = ignoreEuiInternalLeaks
          ? [...activeIntervals.values()].filter((s) => !isEuiOrReactInternal(s))
          : [...activeIntervals.values()];
        if (reportable.length > 0) {
          ctx.issues.push(
            `${chalk.white(`[${label}]`)} ${chalk.red(
              `Leaked ${reportable.length} setInterval(s).`
            )} Ensure all intervals are cleared on unmount.`
          );
        }
      }

      if (activeRAFs.size > 0) {
        const reportable = ignoreEuiInternalLeaks
          ? [...activeRAFs.values()].filter((s) => !isEuiOrReactInternal(s))
          : [...activeRAFs.values()];
        if (reportable.length > 0) {
          ctx.issues.push(
            `${chalk.white(`[${label}]`)} ${chalk.red(
              `Leaked ${reportable.length} requestAnimationFrame(s).`
            )} Ensure all animation frames are cancelled on unmount.`
          );
        }
      }

      const reportableListeners = ignoreEuiInternalLeaks
        ? activeListeners.filter((l) => !isEuiOrReactInternal(l.stack))
        : activeListeners;

      if (reportableListeners.length > 0) {
        const summary = reportableListeners
          .map((l) => `"${l.type}" on ${l.target.constructor?.name ?? 'EventTarget'}`)
          .join(', ');
        ctx.issues.push(
          `${chalk.white(`[${label}]`)} ${chalk.red(
            `Leaked ${reportableListeners.length} event listener(s): ${summary}.`
          )} Ensure all listeners are removed on unmount.`
        );
      }
    },
  };
};

// ─── Helper Components ───────────────────────────────────────────────────────

/** Triggers a startTransition state update on mount (Check 3). */
const TransitionOnMount = ({ children }: PropsWithChildren) => {
  const [, setTick] = useState(0);
  useEffect(() => {
    startTransition(() => setTick((t) => t + 1));
  }, []);
  return <>{children}</>;
};

/**
 * Creates a SuspendOnce component and a reset function.
 * SuspendOnce suspends on first render via a thrown promise, then resolves.
 * The promise is cached so StrictMode double-invoke throws the same
 * thenable, allowing React to deduplicate correctly.
 */
const createSuspendOnce = () => {
  let suspendOncePromise: Promise<void> | null = null;

  const reset = () => {
    suspendOncePromise = null;
  };

  const SuspendOnce = ({ children }: PropsWithChildren) => {
    const [ready, setReady] = useState(false);
    if (!ready) {
      if (!suspendOncePromise) {
        suspendOncePromise = new Promise<void>((resolve) => {
          Promise.resolve().then(() => {
            setReady(true);
            resolve();
          });
        });
      }
      throw suspendOncePromise;
    }
    return <>{children}</>;
  };

  return { SuspendOnce, reset };
};

/**
 * Check 1: StrictMode double-invoke
 * Effects fire twice; cleanup must be idempotent.
 * Catches missing unsubscribes, stacked listeners, leaked timers.
 */
const checkStrictModeDoubleInvoke = (ctx: CheckContext, ui: ReactElement): void => {
  const label = 'Check 1: StrictMode double-invoke';
  const spy = collectErrors(ctx, label);
  const leakDetector = detectLeakedResources(ctx, label);
  try {
    const { unmount, rerender } = safeRender(ctx, ui);
    rerender(ctx.wrap(ui));
    unmount();
  } finally {
    leakDetector.verify();
    spy.flush();
  }
};

/**
 * Check 2: Rapid mount/unmount cycles
 * Stresses cleanup under timing pressure. Three cycles surfaces most races.
 */
const checkRapidMountUnmount = (ctx: CheckContext, ui: ReactElement): void => {
  const label = 'Check 2: Rapid mount/unmount';
  const spy = collectErrors(ctx, label);
  const leakDetector = detectLeakedResources(ctx, label);
  try {
    for (let i = 0; i < 3; i++) {
      const { unmount } = safeRender(ctx, ui);
      unmount();
    }
  } finally {
    leakDetector.verify();
    spy.flush();
  }
};

/**
 * Check 3: startTransition re-render
 * Wraps the component in TransitionOnMount which triggers a
 * startTransition state update on mount.
 *
 * NOTE: Under Jest/JSDOM with act(), startTransition does NOT create
 * a separate priority lane — the update flushes synchronously like
 * any regular setState. This check therefore does NOT verify true
 * transition-priority scheduling. It does exercise the code path
 * through startTransition (catching components that crash or log
 * errors when updated via transition) and validates that the
 * component tolerates an extra re-render shortly after mount.
 */
const checkStartTransitionRerender = async (ctx: CheckContext, ui: ReactElement): Promise<void> => {
  const label = 'Check 3: startTransition re-render';
  const spy = collectErrors(ctx, label);
  const leakDetector = detectLeakedResources(ctx, label);
  try {
    const wrappedUi = <TransitionOnMount>{ui}</TransitionOnMount>;
    const { unmount } = safeRender(ctx, wrappedUi);
    /**
     * Allow the transition to flush - use microtask instead of setTimeout
     * so this works with both real and fake timers.
     */
    await Promise.resolve();
    await new Promise((r) => queueMicrotask(() => r(undefined)));
    unmount();
  } finally {
    leakDetector.verify();
    spy.flush();
  }
};

/**
 * Check 4: Suspense suspend/resume
 * Wraps the component in SuspendOnce which throws a Promise on first
 * render, then resolves. Effects must tolerate running more than once
 * per logical mount.
 */
const checkSuspenseSuspendResume = async (
  ctx: CheckContext,
  ui: ReactElement,
  suspendOnce: { SuspendOnce: React.ComponentType<PropsWithChildren>; reset: () => void }
): Promise<void> => {
  const label = 'Check 4: Suspense suspend/resume';
  const spy = collectErrors(ctx, label);
  const leakDetector = detectLeakedResources(ctx, label);
  try {
    /** Reset so SuspendOnce actually suspends on each invocation */
    suspendOnce.reset();
    const { SuspendOnce } = suspendOnce;
    const wrappedUi = <SuspendOnce>{ui}</SuspendOnce>;
    const { unmount } = safeRender(ctx, wrappedUi);
    /** Tick 1: SuspendOnce throws promise */
    await Promise.resolve();
    /** Tick 2: promise resolves, SuspendOnce re-renders with ready=true */
    await Promise.resolve();
    await Promise.resolve();
    unmount();
  } finally {
    leakDetector.verify();
    spy.flush();
  }
};

/**
 * Check 5: Unmount during in-flight async effects
 * Renders the component, yields to let effects start async operations
 * (e.g. fetches, subscriptions), then unmounts. Catches missing
 * AbortController signals, uncleared async callbacks, and effects
 * that log errors or throw after unmount.
 */
const checkUnmountDuringAsyncEffects = async (
  ctx: CheckContext,
  ui: ReactElement
): Promise<void> => {
  const label = 'Check 5: Unmount during async effects';
  const spy = collectErrors(ctx, label);
  const leakDetector = detectLeakedResources(ctx, label);
  try {
    const { unmount } = safeRender(ctx, ui);
    /** Let useEffect callbacks fire and start async work */
    await Promise.resolve();
    await new Promise((r) => queueMicrotask(() => r(undefined)));
    /** Unmount while async operations are likely still pending */
    unmount();
    /** Yield to post-unmount microtasks */
    await Promise.resolve();
    await Promise.resolve();
  } finally {
    leakDetector.verify();
    spy.flush();
  }
};

/**
 * Check 6: Ref stability across re-renders
 * Intercepts React.createElement to track callback ref identity across
 * two renders with identical props. Unstable refs (e.g. inline arrow
 * `ref={el => ...}`) create a new function on every render, causing
 * React to call oldRef(null) then newRef(node) on each re-render —
 * expensive and can break focus, animations, and imperative handles
 * in concurrent mode where renders may be interrupted and restarted.
 *
 * Detection: on render 1 we collect every callback ref into a Set;
 * on render 2 any callback ref whose identity is absent from that Set
 * is flagged as unstable. This works because Kibana uses the classic
 * JSX transform (`"jsx": "react"`) so all elements go through
 * React.createElement.
 */
const checkRefStability = (ctx: CheckContext, ui: ReactElement): void => {
  const label = 'Check 6: Ref stability';
  const spy = collectErrors(ctx, label);
  const leakDetector = detectLeakedResources(ctx, label);
  try {
    const render1Refs = new Set<Function>();
    const unstableRefTypes: string[] = [];
    let refPhase: 'render1' | 'render2' | 'idle' = 'idle';

    const trackRef = (type: unknown, ref: Function) => {
      if (refPhase === 'render1') {
        render1Refs.add(ref);
      } else if (refPhase === 'render2' && !render1Refs.has(ref)) {
        const name =
          typeof type === 'string'
            ? `<${type}>`
            : `<${(type as any)?.displayName || (type as any)?.name || 'Anonymous'}>`;
        unstableRefTypes.push(name);
      }
    };

    const origCreateElement = React.createElement;
    const ceSpy = jest
      .spyOn(React, 'createElement')
      .mockImplementation(function (this: unknown, type: any, props: any, ...children: any[]) {
        if (refPhase !== 'idle' && props?.ref && typeof props.ref === 'function') {
          trackRef(type, props.ref);
        }
        return origCreateElement.apply(React, [type, props, ...children] as any);
      } as any);

    refPhase = 'render1';
    const { rerender, unmount } = safeRender(ctx, ui);

    refPhase = 'render2';
    rerender(ctx.wrap(ui));

    refPhase = 'idle';
    ceSpy.mockRestore();

    if (unstableRefTypes.length > 0) {
      const unique = [...new Set(unstableRefTypes)];
      ctx.issues.push(
        `${chalk.white('[Check 6: Ref stability]')} ${chalk.red(
          `Unstable callback ref(s) detected on: ${unique.join(', ')}.`
        )} Callback refs recreated on every render cause React to detach and ` +
          `reattach the DOM node. Wrap in useCallback() or use useRef().`
      );
    }

    unmount();
  } finally {
    leakDetector.verify();
    spy.flush();
  }
};

/**
 * Check 7: Render-phase side effects
 * Detects calls to non-deterministic or side-effectful APIs during the
 * React render phase (component function bodies). Math.random() and
 * Date.now() in render bodies cause non-deterministic output across
 * re-renders — problematic in concurrent mode where renders may be
 * interrupted and restarted. Direct DOM mutations (e.g. setting
 * document.title) during render bypass React's reconciliation.
 *
 * Additionally tracks window.scrollTo() and document.body.style
 * mutations during render, which bypass React's reconciliation.
 *
 * Detection uses a wrapper component that sets a flag in its render
 * body; a first-child marker component clears the flag in
 * useLayoutEffect (which fires before any child layout effects due
 * to sibling ordering). Only calls while the flag is active are
 * reported. React internals do not call Math.random(); rare false
 * positives from Date.now() in React scheduling are possible but
 * unlikely under act().
 */
const checkRenderPhaseSideEffects = (ctx: CheckContext, ui: ReactElement): void => {
  const label = 'Check 7: Render-phase side effects';
  const spy = collectErrors(ctx, label);
  const leakDetector = detectLeakedResources(ctx, label);
  let renderPhaseActive = false;
  const renderPhaseCalls: string[] = [];

  const originalMathRandom = Math.random;
  const mathRandomSpy = jest.spyOn(Math, 'random').mockImplementation(() => {
    if (renderPhaseActive) {
      renderPhaseCalls.push('Math.random()');
    }
    return originalMathRandom.call(Math);
  });

  const originalDateNow = Date.now;
  const dateNowSpy = jest.spyOn(Date, 'now').mockImplementation(() => {
    if (renderPhaseActive) {
      renderPhaseCalls.push('Date.now()');
    }
    return originalDateNow.call(Date);
  });

  /** Track document.title mutations during render phase */
  const titleDescriptor =
    Object.getOwnPropertyDescriptor(Document.prototype, 'title') ??
    Object.getOwnPropertyDescriptor(document, 'title');
  const originalTitleSetter = titleDescriptor?.set;
  const originalTitleGetter = titleDescriptor?.get;

  if (originalTitleSetter) {
    Object.defineProperty(document, 'title', {
      get() {
        return originalTitleGetter?.call(this) ?? '';
      },
      set(value: string) {
        if (renderPhaseActive) {
          renderPhaseCalls.push('document.title (setter)');
        }
        originalTitleSetter.call(this, value);
      },
      configurable: true,
    });
  }

  /** Track window.scrollTo calls during render phase */
  const originalScrollTo = window.scrollTo;
  const scrollToSpy = jest.spyOn(window, 'scrollTo').mockImplementation((...args: any[]) => {
    if (renderPhaseActive) {
      renderPhaseCalls.push('window.scrollTo()');
    }
    return originalScrollTo.apply(window, args as any);
  });

  /** Track document.body.style mutations during render phase */
  const bodyStyleDescriptor =
    Object.getOwnPropertyDescriptor(document.body, 'style') ??
    Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'style');
  const originalBodyStyleGetter = bodyStyleDescriptor?.get;

  let bodyStyleProxy: CSSStyleDeclaration | undefined;
  if (originalBodyStyleGetter) {
    const realStyle = originalBodyStyleGetter.call(document.body);
    bodyStyleProxy = new Proxy(realStyle, {
      set(target, prop, value) {
        if (renderPhaseActive && typeof prop === 'string') {
          renderPhaseCalls.push(`document.body.style.${prop}`);
        }
        (target as any)[prop] = value;
        return true;
      },
    });
    Object.defineProperty(document.body, 'style', {
      get() {
        return bodyStyleProxy;
      },
      configurable: true,
    });
  }

  try {
    /**
     * RenderPhaseEndMarker is placed as the first child so its
     * useLayoutEffect fires before any child useLayoutEffect,
     * ensuring the flag is cleared before effect-phase code runs.
     */
    const RenderPhaseEndMarker = () => {
      useLayoutEffect(() => {
        renderPhaseActive = false;
      });
      return null;
    };

    const RenderPhaseGuard = ({ children }: PropsWithChildren) => {
      renderPhaseActive = true;
      return (
        <>
          <RenderPhaseEndMarker />
          {children}
        </>
      );
    };

    const guardedUi = <RenderPhaseGuard>{ui}</RenderPhaseGuard>;
    const { unmount } = safeRender(ctx, guardedUi);
    unmount();

    if (renderPhaseCalls.length > 0) {
      const counts = renderPhaseCalls.reduce<Record<string, number>>((acc, api) => {
        acc[api] = (acc[api] ?? 0) + 1;
        return acc;
      }, {});
      const details = Object.entries(counts)
        .map(([api, count]) => `${api} ×${count}`)
        .join(', ');
      ctx.issues.push(
        `${chalk.white('[Check 7: Render-phase side effects]')} ${chalk.red(
          `Detected side effects during render: ${details}.`
        )} Move non-deterministic calls (Math.random, Date.now) to effects or memoize results. Avoid direct DOM mutations during render.`
      );
    }
  } finally {
    mathRandomSpy.mockRestore();
    dateNowSpy.mockRestore();
    scrollToSpy.mockRestore();
    if (originalTitleSetter && titleDescriptor) {
      Object.defineProperty(document, 'title', titleDescriptor);
    }
    if (originalBodyStyleGetter && bodyStyleDescriptor) {
      Object.defineProperty(document.body, 'style', bodyStyleDescriptor);
    }
    leakDetector.verify();
    spy.flush();
  }
};

/**
 * Check 8: Post-unmount async state updates
 * Renders with fake timers, unmounts, then flushes pending timers so
 * delayed callbacks fire setState on the already-unmounted tree.
 * NOTE: React 18 removed the "Can't perform a React state update on an
 * unmounted component" warning, so this check catches issues only if
 * the component (or libraries it uses) logs its own errors/warnings
 * during the post-unmount callback. It still exercises the code path
 * and will catch thrown exceptions or custom error logging.
 */
const checkPostUnmountStateUpdates = async (ctx: CheckContext, ui: ReactElement): Promise<void> => {
  jest.useFakeTimers();

  const label = 'Check 8: Post-unmount state updates';
  const spy = collectErrors(ctx, label);
  const leakDetector = detectLeakedResources(ctx, label);

  try {
    let unmountFn: (() => void) | undefined;

    act(() => {
      const result = render(ctx.wrap(ui));
      unmountFn = result.unmount;
    });

    act(() => {
      unmountFn?.();
    });

    act(() => {
      jest.runAllTimers();
    });

    /** Yield to microtasks for promise-based setState(s) */
    await Promise.resolve();
    await Promise.resolve();
  } finally {
    /** Verify if anything was left hanging */
    leakDetector.verify();
    spy.flush();
  }
};

/**
 * Tests a component for React 18 Concurrent Mode compatibility.
 *
 * Catches common migration issues such as non-idempotent effect cleanup,
 * leaked timers/listeners, and console errors under StrictMode and Suspense.
 *
 * Checks performed:
 *  1. StrictMode double effect invocation (cleanup idempotency)
 *  2. Rapid mount/unmount cycles (cleanup race conditions)
 *  3. startTransition re-render (re-render via transition-priority API)
 *  4. Suspense suspend/resume (real promise-throwing suspension)
 *  5. Unmount during in-flight async effects (early teardown)
 *  6. Ref stability across re-renders (callback ref identity)
 *  7. Render-phase side effects (Math.random, Date.now, document.title)
 *  8. Post-unmount state updates & leaked resources (fake timers)
 *
 * Limitations — this utility runs inside Jest/JSDOM with `act()`, which
 * flushes updates synchronously. It therefore **cannot** detect:
 *  - External store tearing (audit `useSyncExternalStore` usage instead)
 *  - Interrupted/restarted renders (requires real concurrent scheduler)
 *  - Time-slicing state inconsistencies
 *  - Render-order-dependent component behavior
 *
 * Use this as a baseline hygiene check, not as proof of full concurrent
 * mode safety.
 *
 * @throws if any check fails, with a human-readable description of each issue
 *
 * @example
 * it('is ConcurrentMode-compatible', async () => {
 *   await checkConcurrentModeCompatibility(
 *     <MyAppProviders>
 *       <MyComponent {...props} />
 *     </MyAppProviders>
 *   );
 * });
 */
export const checkConcurrentModeCompatibility = async (
  ui: ReactElement,
  options: {
    /** Whether to fail on console warnings (default: true) */
    failOnWarnings?: boolean;
    /**
     * Whether to ignore leaked resources (timers, RAF, event listeners)
     * originating from EUI internals (@elastic/eui) or React's own event
     * delegation. (default: true)
     */
    ignoreEuiInternalLeaks?: boolean;
  } = {}
): Promise<void> => {
  const { failOnWarnings = true, ignoreEuiInternalLeaks = true } = options;

  const ctx: CheckContext = {
    issues: [],
    failOnWarnings,
    ignoreEuiInternalLeaks,
    wrap: wrapWithProviders,
  };

  const suspendOnce = createSuspendOnce();

  /**
   * Detect whether the caller already has fake timers active so we can
   * restore the original state at the end. React's async act() deadlocks
   * with fake timers, so we ensure real timers for Checks 1-7.
   */
  const hadFakeTimers = (() => {
    try {
      jest.getRealSystemTime();
      return true;
    } catch {
      return false;
    }
  })();

  if (hadFakeTimers) {
    jest.useRealTimers();
  }

  /** Checks 1-7 run inside a single async act() call. */
  await act(async () => {
    checkStrictModeDoubleInvoke(ctx, ui);
    checkRapidMountUnmount(ctx, ui);
    await checkStartTransitionRerender(ctx, ui);
    await checkSuspenseSuspendResume(ctx, ui, suspendOnce);
    await checkUnmountDuringAsyncEffects(ctx, ui);
    checkRefStability(ctx, ui);
    checkRenderPhaseSideEffects(ctx, ui);
  });

  /** Check 8 runs separately with fake timers (async act() deadlocks). */
  await checkPostUnmountStateUpdates(ctx, ui);

  if (hadFakeTimers) {
    jest.useFakeTimers();
  } else {
    jest.useRealTimers();
  }

  if (ctx.issues.length > 0) {
    const header = chalk.bold.red(`React 18 Concurrent Mode issues (${ctx.issues.length}):`);
    const list = ctx.issues.map((msg, i) => `  ${chalk.white(`${i + 1}.`)} ${msg}`).join('\n');
    throw new Error(`${header}\n\n${list}`);
  }
};
