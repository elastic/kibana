/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OtelLogDocument } from '../otel_logs';
import type { Serializable } from '../serializable';
import { sample, type Distribution } from '../edot_shared/health_profiles';
import { between, pick, randomHex } from '../edot_shared/random';
import type { MobilePlatform } from './device_profiles';
import type { EdotReactNativeClient } from './edot_react_native_client';
import type { EdotReactNativeSpanDocument } from './edot_react_native_span';
import type { MobileHealthProfile } from './health_profiles';

export interface EdotReactNativeRequest {
  method: string;
  url: string;
  /** Overrides the health profile's failure rate for this endpoint. */
  failureRate?: number;
  /** Status codes to pick from when the request fails. */
  failureStatusCodes?: readonly number[];
  /** Multiplies the health profile's HTTP latency. */
  latencyFactor?: number;
  /** Size of the request body in bytes. Sampled for POST and PUT requests when unset. */
  bodySizeBytes?: number;
  /** The message the app logs with `emitLog(message, 'error')` when the request fails. */
  errorLog?: string;
}

export interface EdotReactNativeWidget {
  /** `app.widget.id`, e.g. from the `testID` prop. */
  id: string;
  /** `app.widget.name`, e.g. the visible text. */
  name?: string;
  /** Request fired by tapping the widget. */
  request?: EdotReactNativeRequest;
}

export interface EdotReactNativeScreen {
  name: string;
  /**
   * The navigation title of the screen's view controller, which names its span on iOS. Screens
   * without one are named after their react-native-screens class, `RNSScreen`.
   */
  iosTitle?: string;
  /** Requests fired when the screen is shown. */
  requests?: readonly EdotReactNativeRequest[];
  widgets?: readonly EdotReactNativeWidget[];
}

export interface EdotReactNativeCrashTemplate {
  type: string;
  message: string;
}

export interface EdotReactNativeAppModel {
  /** The first screen is the one the app opens on. */
  screens: readonly EdotReactNativeScreen[];
  /** Messages of errors the app logs, on top of the ones of failed requests. */
  errorLogs?: readonly string[];
  /** Crashes specific to this app per platform, on top of common ones. */
  crashes?: Partial<Record<MobilePlatform, readonly EdotReactNativeCrashTemplate[]>>;
}

/** Spans the app creates itself, as the SDKs don't record launches or React Native screens. */
export interface ManualSpanOptions {
  /** An `app.launch` span for every cold launch. */
  launch?: boolean;
  /** A span named after the screen for every screen view, on both platforms. */
  screens?: boolean;
}

/** When the session takes place: from `start` on, or ending at `end`. */
type SessionAnchor = { start: number; end?: undefined } | { end: number; start?: undefined };

export type EdotReactNativeSessionOptions = SessionAnchor & {
  client: EdotReactNativeClient;
  app: EdotReactNativeAppModel;
  health: MobileHealthProfile;
  screenViews: number;
  /** Times the user opens the app during the session; screen views are spread over them. */
  visits?: number;
  /** How long the user stays on a screen once it has appeared, in milliseconds. */
  dwell?: Distribution;
  manualSpans?: ManualSpanOptions;
  random?: () => number;
};

export type EdotReactNativeDocument = OtelLogDocument | EdotReactNativeSpanDocument;
export type EdotReactNativeEvent = Serializable<EdotReactNativeDocument>;

const MINUTE_MS = 60_000;
// Both SDKs start a new session after 30 minutes without activity
export const SESSION_IDLE_TIMEOUT_MS = 30 * MINUTE_MS;
// EDOT Android also starts a new session after 4 hours
export const ANDROID_MAX_SESSION_MS = 4 * 60 * MINUTE_MS;
const DEFAULT_DWELL: Distribution = { median: 15_000, sigma: 0.9 };
const MIN_DWELL_MS = 1_000;
// A return to the app takes much less than a cold launch
const WARM_LAUNCH_FACTOR = 0.25;
const MAX_TAPS_PER_SCREEN = 2;
const DEFAULT_FAILURE_STATUS_CODES = [500, 502, 503, 504] as const;
const FAULT_ADDRESS_RANGE = 2 ** 32;

const COMMON_ERROR_LOGS: readonly string[] = [
  'Failed to restore persisted state',
  'Image failed to load',
  'Unexpected response format',
];

const COMMON_CRASHES: Readonly<Record<MobilePlatform, readonly EdotReactNativeCrashTemplate[]>> = {
  android: [
    {
      type: 'com.facebook.react.common.JavascriptException',
      message: "TypeError: Cannot read property 'map' of undefined, js engine: hermes",
    },
    {
      type: 'java.lang.OutOfMemoryError',
      message: 'Failed to allocate a 33554448 byte allocation with 25165824 free bytes',
    },
    { type: 'java.lang.IllegalStateException', message: 'Fragment not attached to an activity.' },
  ],
  // EDOT iOS reports the signal and its code; the message is completed with an address
  ios: [
    { type: 'SIGABRT', message: '#0' },
    { type: 'SIGSEGV', message: 'SEGV_MAPERR' },
    { type: 'EXC_BAD_ACCESS', message: 'KERN_INVALID_ADDRESS' },
  ],
};

interface TransportError {
  type: string;
  message: string;
}

const TRANSPORT_ERRORS: Readonly<Record<MobilePlatform, readonly TransportError[]>> = {
  android: [
    { type: 'java.net.SocketTimeoutException', message: 'timeout' },
    { type: 'java.net.UnknownHostException', message: 'Unable to resolve host' },
  ],
  ios: [
    { type: 'URLError', message: 'The request timed out.' },
    { type: 'URLError', message: 'The Internet connection appears to be offline.' },
  ],
};

/*
 * How a session is built
 *
 * Like EDOT Browser sessions, a session is planned first and then simulated.
 *
 * Planning (`planVisits`) decides the session's structure and timing:
 * - A session is a sequence of visits: the user opens the app, goes through a few screens and
 *   leaves it. Visits are less than 30 minutes apart, otherwise the SDKs would start a new session,
 *   and EDOT Android sessions last at most 4 hours.
 * - A visit starts with a launch, cold for the first visit and warm when the user comes back, and
 *   shows screen views (`ScreenViewPlan`) back to back. Each screen appears for a sampled time and
 *   the user stays on it for a sampled dwell time.
 * - A visit may end with a crash during its last screen view.
 * - Plans start at time 0. `session()` then moves them to the requested `start` or `end`.
 *
 * Simulation (`simulateVisit`) turns each visit into events:
 * - the launch: iOS lifecycle events, the root view controller appearing on iOS, and the opt-in
 *   manual `app.launch` span
 * - each screen view: the iOS view span, the opt-in manual screen span, the screen's requests,
 *   taps and the requests they fire, and error logs
 * - the crash: EDOT Android writes it right away, EDOT iOS on the next launch. When the session
 *   ends with an iOS crash, the user relaunches the app within the session to report it.
 *
 * Planning and simulation draw from the same `random` source, so a seed reproduces a session.
 */

interface SessionContext {
  client: EdotReactNativeClient;
  app: EdotReactNativeAppModel;
  health: MobileHealthProfile;
  manualSpans: ManualSpanOptions;
  random: () => number;
}

interface ScreenViewPlan {
  screen: EdotReactNativeScreen;
  start: number;
  /** When the screen has appeared and the user can interact with it. */
  appeared: number;
  end: number;
}

interface VisitPlan {
  start: number;
  cold: boolean;
  /** When the first screen starts to appear. */
  launched: number;
  screenViews: ScreenViewPlan[];
  end: number;
  /** When the app crashes, at the end of the visit. */
  crashedAt?: number;
}

const iosViewTitle = ({ iosTitle }: EdotReactNativeScreen) => iosTitle ?? 'RNSScreen';

const shiftVisit = (visit: VisitPlan, offset: number): VisitPlan => ({
  ...visit,
  start: visit.start + offset,
  launched: visit.launched + offset,
  end: visit.end + offset,
  screenViews: visit.screenViews.map((view) => ({
    ...view,
    start: view.start + offset,
    appeared: view.appeared + offset,
    end: view.end + offset,
  })),
  ...(visit.crashedAt !== undefined ? { crashedAt: visit.crashedAt + offset } : {}),
});

// Screen views are spread over the visits, at least one each. Cold launches open on the app's
// first screen, warm ones on any screen.
const planVisits = (
  { app, health, client, random }: SessionContext,
  { screenViews, visits, dwell }: { screenViews: number; visits: number; dwell: Distribution }
): VisitPlan[] => {
  const plans: VisitPlan[] = [];
  const visitCount = Math.max(1, Math.min(visits, screenViews));
  let time = 0;

  for (let visitIndex = 0; visitIndex < visitCount; visitIndex++) {
    // The first launch is cold, and so is the one after a crash
    const cold = visitIndex === 0 || plans[plans.length - 1].crashedAt !== undefined;
    const launchDuration =
      sample(health.coldLaunch, random) * client.slowdown * (cold ? 1 : WARM_LAUNCH_FACTOR);
    const start = time;
    const launched = Math.round(start + launchDuration);
    const viewsInVisit =
      Math.floor(screenViews / visitCount) + (visitIndex < screenViews % visitCount ? 1 : 0);

    let viewStart = launched;
    const views: ScreenViewPlan[] = [];
    for (let i = 0; i < viewsInVisit; i++) {
      const screen = cold && i === 0 ? app.screens[0] : pick(random, app.screens);
      const appeared = Math.round(
        viewStart + Math.max(sample(health.viewAppear, random) * client.slowdown, 1)
      );
      const end = appeared + Math.max(Math.round(sample(dwell, random)), MIN_DWELL_MS);
      views.push({ screen, start: viewStart, appeared, end });
      viewStart = end + 1;
    }

    const crashes = random() < health.crashRate;
    const lastView = views[views.length - 1];
    if (crashes) {
      // The app crashes while the user is on the last screen, which ends the visit
      lastView.end = Math.max(
        Math.round(between(random, lastView.appeared, lastView.end)),
        lastView.appeared + 1
      );
    }
    const end = lastView.end;
    const gap = between(random, 0.05, 0.95) * SESSION_IDLE_TIMEOUT_MS;

    const plan: VisitPlan = {
      start,
      cold,
      launched,
      screenViews: views,
      end,
      ...(crashes ? { crashedAt: end } : {}),
    };
    if (
      client.platform === 'android' &&
      plans.length > 0 &&
      plan.end - plans[0].start > ANDROID_MAX_SESSION_MS
    ) {
      break;
    }
    plans.push(plan);
    time = end + Math.round(gap);
  }

  return plans;
};

const newTraceContext = (random: () => number) => ({
  traceId: randomHex(random, 32),
  spanId: randomHex(random, 16),
});

/** A request and what follows from it: its span, its exception event and the app's error log. */
const sendRequest = (
  { client, health, random }: SessionContext,
  request: EdotReactNativeRequest,
  requestedTime: number,
  latestEnd: number,
  parent?: { traceId: string; spanId: string }
): EdotReactNativeEvent[] => {
  // The request, and with it its 1ms minimum duration, must end within the screen view
  const time = Math.min(requestedTime, latestEnd - 1);
  const {
    method,
    url,
    failureRate = health.httpFailureRate,
    failureStatusCodes = DEFAULT_FAILURE_STATUS_CODES,
    latencyFactor = 1,
    bodySizeBytes,
    errorLog,
  } = request;
  const duration = Math.max(
    Math.min(sample(health.httpLatency, random) * latencyFactor, latestEnd - time),
    1
  );
  const isNetworkError = random() < health.networkErrorRate;
  const statusCode = isNetworkError
    ? undefined
    : random() < failureRate
    ? pick(random, failureStatusCodes)
    : method === 'POST'
    ? 201
    : 200;
  const transportError = isNetworkError
    ? pick(random, TRANSPORT_ERRORS[client.platform])
    : undefined;
  const hasBody = method === 'POST' || method === 'PUT';
  const requestBodySize =
    bodySizeBytes ?? (hasBody ? Math.round(between(random, 120, 2_000)) : undefined);
  const responseBodySize = Math.round(between(random, 200, 20_000));
  const { traceId, spanId } = newTraceContext(random);
  const ids = { traceId: parent?.traceId ?? traceId, spanId };
  const endTime = Math.floor(time + duration);

  const events: EdotReactNativeEvent[] = [
    client
      .httpRequest({
        method,
        url,
        statusCode,
        errorType: transportError?.type,
        requestBodySize,
        responseBodySize,
        parentSpanId: parent?.spanId,
        ...ids,
      })
      .timestamp(time)
      .duration(duration),
  ];
  const exceptionEvent = client.httpExceptionEvent({
    ...ids,
    statusCode,
    errorType: transportError?.type,
    errorMessage: transportError?.message,
  });
  if (exceptionEvent) {
    events.push(exceptionEvent.timestamp(endTime));
  }

  const failed = statusCode === undefined || statusCode >= 400;
  if (failed && errorLog) {
    const reason = statusCode === undefined ? transportError?.message : `HTTP ${statusCode}`;
    events.push(
      client.errorLog(`${errorLog}: ${reason}`).timestamp(Math.min(endTime + 1, latestEnd))
    );
  }
  return events;
};

const stacktraceOf = (
  { platform }: EdotReactNativeClient,
  { type, message }: EdotReactNativeCrashTemplate,
  random: () => number
): string => {
  if (platform === 'android') {
    return [
      `${type}: ${message}`,
      '\tat com.facebook.react.modules.core.ExceptionsManagerModule.reportException(ExceptionsManagerModule.java:65)',
      '\tat com.facebook.jni.NativeRunnable.run(Native Method)',
      '\tat android.os.Handler.handleCallback(Handler.java:958)',
      '\tat android.os.Looper.loop(Looper.java:294)',
    ].join('\n');
  }
  const address = () => `0x${randomHex(random, 9)}`;
  return [
    `Exception Type:  ${type}`,
    '',
    'Thread 0 Crashed:',
    `0   libsystem_kernel.dylib          ${address()} __pthread_kill + 8`,
    `1   libsystem_pthread.dylib         ${address()} pthread_kill + 268`,
    `2   hermes                          ${address()} hermes::vm::Runtime::raiseError + 112`,
    `3   React                           ${address()} RCTFatal + 532`,
  ].join('\n');
};

interface CrashReport {
  type: string;
  message: string;
  stacktrace: string;
}

interface PendingCrash {
  crashedAt: number;
  crash: CrashReport;
}

/** The crash a visit ends with, described as the platform's crash reporter does. */
const describeCrash = ({ client, app, random }: SessionContext): CrashReport => {
  const templates = [...(app.crashes?.[client.platform] ?? []), ...COMMON_CRASHES[client.platform]];
  const template = pick(random, templates);
  const stacktrace = stacktraceOf(client, template, random);
  // PLCrashReporter writes the signal code and the faulting address in decimal
  const message =
    client.platform === 'ios'
      ? `${template.message} at ${Math.floor(random() * FAULT_ADDRESS_RANGE)}`
      : template.message;
  return { type: template.type, message, stacktrace };
};

/** Everything that happens on one screen view. */
const viewScreen = (ctx: SessionContext, view: ScreenViewPlan): EdotReactNativeEvent[] => {
  const { client, app, health, manualSpans, random } = ctx;
  const { screen, start, appeared, end } = view;
  const events: EdotReactNativeEvent[] = [];

  // On iOS, the view span is current while the screen appears, so its requests become children
  const viewContext = newTraceContext(random);
  if (client.platform === 'ios') {
    events.push(
      client
        .viewAppearing({ title: iosViewTitle(screen), ...viewContext })
        .timestamp(start)
        .duration(Math.max(appeared - start, 1))
    );
  }
  // Drawn even without manual spans, so that the option doesn't change the rest of the session
  const screenSpanContext = newTraceContext(random);
  if (manualSpans.screens) {
    events.push(
      client
        .manualSpan({ name: screen.name, ...screenSpanContext })
        .timestamp(start)
        .duration(end - start)
    );
  }

  (screen.requests ?? []).forEach((request) => {
    const time = Math.round(between(random, start, Math.max(appeared, start + 1)));
    const parent = client.platform === 'ios' && time < appeared ? viewContext : undefined;
    events.push(...sendRequest(ctx, request, time, end, parent));
  });

  const widgets = screen.widgets ?? [];
  const taps = widgets.length ? Math.floor(random() * (MAX_TAPS_PER_SCREEN + 1)) : 0;
  for (let i = 0; i < taps; i++) {
    const widget = pick(random, widgets);
    const time = Math.round(between(random, appeared, end - 1));
    events.push(client.widgetClick({ id: widget.id, name: widget.name }).timestamp(time));
    if (widget.request) {
      events.push(...sendRequest(ctx, widget.request, time + 5, end));
    }
  }

  if (random() < health.errorLogRate) {
    const messages = [...(app.errorLogs ?? []), ...COMMON_ERROR_LOGS];
    const time = Math.round(between(random, appeared, end));
    events.push(client.errorLog(pick(random, messages)).timestamp(time));
  }

  return events;
};

/** Everything that happens during one visit, with the crash of the previous visit if any. */
const simulateVisit = (
  ctx: SessionContext,
  visit: VisitPlan,
  pendingCrash?: PendingCrash
): { events: EdotReactNativeEvent[]; crash?: PendingCrash } => {
  const { client, manualSpans, random } = ctx;
  const { start, cold, launched, screenViews, end, crashedAt } = visit;
  const events: EdotReactNativeEvent[] = [];

  if (pendingCrash) {
    // EDOT iOS reports the previous launch's crash once it has started again
    events.push(
      client
        .crash(pendingCrash.crash)
        .timestamp(start + 1)
        .observedAt(pendingCrash.crashedAt)
    );
  }

  if (client.platform === 'ios') {
    if (!cold) {
      events.push(client.lifecycle('foreground').timestamp(start));
    }
    events.push(client.lifecycle('active').timestamp(launched));
    if (cold) {
      // The React Native root view controller appears once the app has launched
      events.push(
        client
          .viewAppearing({ title: 'UIViewController', ...newTraceContext(random) })
          .timestamp(Math.max(launched - 1, start))
          .duration(1)
      );
    }
  }
  // Drawn even without manual spans, so that the option doesn't change the rest of the session
  const launchSpanContext = newTraceContext(random);
  if (cold && manualSpans.launch) {
    events.push(
      client
        .manualSpan({ name: 'app.launch', ...launchSpanContext })
        .timestamp(start)
        .duration(Math.max(launched - start, 1))
    );
  }

  events.push(...screenViews.flatMap((view) => viewScreen(ctx, view)));

  if (crashedAt !== undefined) {
    const crash = describeCrash(ctx);
    if (client.platform === 'ios') {
      return { events, crash: { crashedAt, crash } };
    }
    events.push(client.crash(crash).timestamp(crashedAt));
    return { events };
  }

  if (client.platform === 'ios') {
    // The user leaves the app at the end of the visit, which the session doesn't outlast
    events.push(
      client.lifecycle('inactive').timestamp(end - 1),
      client.lifecycle('background').timestamp(end)
    );
  }
  return { events };
};

/** Builds an EDOT React Native session as the client's platform SDK records it. */
export const session = (options: EdotReactNativeSessionOptions): EdotReactNativeEvent[] => {
  const {
    client,
    app,
    health,
    screenViews,
    visits = 1,
    dwell = DEFAULT_DWELL,
    manualSpans = {},
    random = Math.random,
  } = options;
  if (app.screens.length === 0) {
    throw new Error('An app must have at least one screen to simulate a session');
  }
  const ctx: SessionContext = { client, app, health, manualSpans, random };
  const plans = planVisits(ctx, { screenViews: Math.max(screenViews, 1), visits, dwell });

  // An iOS crash at the end of the session is reported when the user relaunches the app
  const last = plans[plans.length - 1];
  if (client.platform === 'ios' && last.crashedAt !== undefined) {
    const relaunchAt = last.end + Math.round(between(random, 0.05, 0.5) * SESSION_IDLE_TIMEOUT_MS);
    // The relaunch only reports the crash, so it doesn't crash again
    const relaunchCtx = { ...ctx, health: { ...health, crashRate: 0 } };
    const [relaunch] = planVisits(relaunchCtx, { screenViews: 1, visits: 1, dwell });
    plans.push(shiftVisit(relaunch, relaunchAt));
  }

  const duration = plans[plans.length - 1].end - plans[0].start;
  const start = options.start !== undefined ? options.start : options.end - duration;

  let pendingCrash: PendingCrash | undefined;
  return plans
    .map((plan) => shiftVisit(plan, start))
    .flatMap((plan) => {
      const { events, crash } = simulateVisit(ctx, plan, pendingCrash);
      pendingCrash = crash;
      return events;
    });
};
