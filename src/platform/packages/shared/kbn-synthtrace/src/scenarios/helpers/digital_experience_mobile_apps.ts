/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  createSeededRandom,
  edotReactNative,
  MOBILE_PLATFORM,
  MOBILE_PLATFORMS,
  type DeviceProfileId,
  type EdotReactNativeAppModel,
  type EdotReactNativeDocument,
  type HealthProfileName,
  type MobileHealthProfile,
  type MobilePlatform,
  type NetworkConnection,
  type Serializable,
  type SynthtraceGenerator,
  type Timerange,
} from '@kbn/synthtrace-client';
import {
  generateOngoingPerMinute,
  generatePerMinute,
  getDefaultSeed,
  getTimestamp,
  parseBooleanOption,
  parseScale,
  parseSeed,
  randomUuid,
  type OngoingSessionStore,
} from './digital_experience_apps';

export interface DigitalExperienceMobileAppVersion {
  serviceVersion: string;
  buildNumber: number;
  /** Share of the installations that run this version. */
  share: number;
  /** Crashes only this version has, on top of the app's. */
  crashes?: EdotReactNativeAppModel['crashes'];
  /** Overrides the app's health profile for this version, e.g. its crash rate or launch time. */
  health?: Partial<Omit<MobileHealthProfile, 'name'>>;
  /**
   * Rolls the version out from the start of the run: `initialAdoption` of all the installations run
   * it from the start, and all of them `hours` later, which replaces its `share`. The others run the
   * older versions by their shares until their turn. Only the newest version can roll out.
   */
  rollout?: { initialAdoption: number; hours: number };
}

export interface DigitalExperienceMobileApp {
  serviceName: string;
  /** The versions the installations run, newest first. */
  versions: readonly DigitalExperienceMobileAppVersion[];
  /** Android application ID and iOS bundle ID. */
  appId: string;
  health: HealthProfileName;
  sessionsPerMinute: number;
  /** Overrides the number of installations the sessions take turns among. */
  installations?: number;
  /** Omits the environment, which EDOT iOS then reports as `default`. */
  withoutEnvironment?: boolean;
  /** Overrides the default weights of the listed devices only; a weight of 0 leaves one out. */
  deviceWeights?: Partial<Record<DeviceProfileId, number>>;
  model: EdotReactNativeAppModel;
  /** Whether the app creates its own `app.launch` and screen spans. */
  manualSpans?: { launch?: boolean; screens?: boolean };
  /** Built with EDOT Android or EDOT iOS directly, without React Native. */
  native?: boolean;
}

/** The `platform` option that generates sessions of every platform. */
export const ALL_MOBILE_PLATFORMS = 'both';

export type MobilePlatformOpt = MobilePlatform | typeof ALL_MOBILE_PLATFORMS;

const MOBILE_PLATFORM_OPTS: readonly MobilePlatformOpt[] = [
  ...MOBILE_PLATFORMS,
  ALL_MOBILE_PLATFORMS,
];

export interface DigitalExperienceMobileScenarioOpts {
  /**
   * Multiplies the number of sessions per minute of every app. Fractions of a session add up over
   * time, so a scale below 1 thins out every app in proportion.
   */
  scale: number;
  /** Makes the data reproducible. The parser defaults it to {@link getDefaultSeed}. */
  seed: string;
  /** Generates sessions of one platform only. Apps without devices of that platform write nothing. */
  platform: MobilePlatformOpt;
  /** Write the `app.launch` and screen spans that some apps create themselves. */
  withManualSpans: boolean;
}

const DEFAULT_MOBILE_SCENARIO_OPTS: Omit<DigitalExperienceMobileScenarioOpts, 'seed'> = {
  scale: 1,
  platform: ALL_MOBILE_PLATFORMS,
  withManualSpans: true,
};

const WEATHER_API = 'https://weather-api.example.com';
const SHOP_API = 'https://api.example-store.com';
const BANK_API = 'https://api.example-bank.com';
const NEWS_API = 'https://api.example-news.com';
const NEWS_CDN = 'https://media.example-news.com';
const FIELD_API = 'https://field.example-utilities.com';

/** Device weights that leave out every device of the other platforms. */
const onlyOn = (platform: MobilePlatform): Partial<Record<DeviceProfileId, number>> =>
  Object.fromEntries(
    Object.values(edotReactNative.deviceProfiles)
      .filter((profile) => profile.platform !== platform)
      .map(({ id }) => [id, 0])
  );

const ANDROID_ONLY = onlyOn(MOBILE_PLATFORM.ANDROID);
const IOS_ONLY = onlyOn(MOBILE_PLATFORM.IOS);

const forecastWidget = (city: string, failing = false) => ({
  id: 'show-forecast',
  name: 'Show forecast',
  request: {
    method: 'GET',
    url: `${WEATHER_API}/v1/forecast?city=${encodeURIComponent(city)}`,
    // Like the weather demo backend, which fails for New York
    ...(failing ? { failureRate: 1, failureStatusCodes: [500] } : {}),
    errorLog: 'Error while fetching forecast',
  },
});

export const DIGITAL_EXPERIENCE_MOBILE_APPS: readonly DigitalExperienceMobileApp[] = [
  {
    // Modelled on the EDOT weather demos, with the same backend endpoints
    serviceName: 'weather-demo-react-native',
    versions: [
      { serviceVersion: '1.0.0', buildNumber: 12, share: 0.7 },
      { serviceVersion: '0.9.1', buildNumber: 11, share: 0.25 },
      { serviceVersion: '0.9.0', buildNumber: 10, share: 0.05 },
    ],
    appId: 'co.elastic.otel.demo.weather',
    health: 'healthy',
    sessionsPerMinute: 3,
    manualSpans: { launch: true },
    model: {
      screens: [
        {
          name: 'Cities',
          iosTitle: 'Weather',
          requests: [{ method: 'GET', url: `${WEATHER_API}/v1/health` }],
          widgets: [
            forecastWidget('Berlin'),
            forecastWidget('London'),
            forecastWidget('Paris'),
            forecastWidget('New York', true),
          ],
        },
        {
          name: 'Forecast',
          iosTitle: 'Forecast',
          widgets: [{ id: 'back', name: 'Back' }],
        },
      ],
    },
  },
  {
    serviceName: 'shop-mobile',
    versions: [
      { serviceVersion: '5.3.1', buildNumber: 5031, share: 0.7 },
      { serviceVersion: '5.3.0', buildNumber: 5030, share: 0.25 },
      { serviceVersion: '5.2.4', buildNumber: 5024, share: 0.05 },
    ],
    appId: 'com.example.store',
    health: 'healthy',
    sessionsPerMinute: 6,
    deviceWeights: { galaxyS23Android14: 30, galaxyA14Android13: 25, iphone12Ios17: 8 },
    manualSpans: { launch: true, screens: true },
    model: {
      screens: [
        {
          name: 'Home',
          requests: [
            { method: 'GET', url: `${SHOP_API}/api/products?featured=true` },
            { method: 'GET', url: `${SHOP_API}/api/promotions` },
          ],
          widgets: [{ id: 'search-button', name: 'Search' }, { id: 'banner-sale' }],
        },
        {
          name: 'ProductDetail',
          iosTitle: 'Product',
          requests: [{ method: 'GET', url: `${SHOP_API}/api/products/8812` }],
          widgets: [
            {
              id: 'add-to-cart',
              name: 'Add to cart',
              request: { method: 'POST', url: `${SHOP_API}/api/cart/items`, bodySizeBytes: 96 },
            },
          ],
        },
        {
          name: 'Cart',
          iosTitle: 'Cart',
          requests: [{ method: 'GET', url: `${SHOP_API}/api/cart` }],
          widgets: [
            {
              id: 'checkout',
              name: 'Checkout',
              request: {
                method: 'POST',
                url: `${SHOP_API}/api/orders`,
                errorLog: 'Order submission failed',
              },
            },
          ],
        },
        {
          name: 'Search',
          requests: [{ method: 'GET', url: `${SHOP_API}/api/search?q=sneakers` }],
        },
      ],
    },
  },
  {
    serviceName: 'banking-mobile',
    versions: [
      {
        serviceVersion: '3.8.0',
        buildNumber: 380,
        share: 0.7,
        // A regression of the newest version
        crashes: {
          android: [
            {
              type: 'com.facebook.react.common.JavascriptException',
              message: "TypeError: undefined is not an object (evaluating 'payee.iban')",
            },
          ],
        },
      },
      { serviceVersion: '3.7.2', buildNumber: 372, share: 0.25 },
      { serviceVersion: '3.7.0', buildNumber: 370, share: 0.05 },
    ],
    appId: 'com.example.bank',
    health: 'erroring',
    sessionsPerMinute: 3,
    // About 15% Android
    deviceWeights: {
      pixel8Android15: 5,
      galaxyS23Android14: 5,
      galaxyA14Android13: 5,
      iphone15ProIos18: 40,
      iphone12Ios17: 25,
    },
    model: {
      screens: [
        {
          name: 'Accounts',
          iosTitle: 'Accounts',
          requests: [{ method: 'GET', url: `${BANK_API}/api/accounts` }],
          widgets: [{ id: 'account-row', name: 'Checking' }],
        },
        {
          name: 'Transfer',
          iosTitle: 'Transfer',
          requests: [{ method: 'GET', url: `${BANK_API}/api/payees` }],
          widgets: [
            {
              id: 'transfer-submit',
              name: 'Send money',
              request: {
                method: 'POST',
                url: `${BANK_API}/api/transfers`,
                failureRate: 0.25,
                failureStatusCodes: [500, 502, 503],
                errorLog: 'Transfer failed',
              },
            },
          ],
        },
        {
          name: 'Transactions',
          requests: [{ method: 'GET', url: `${BANK_API}/api/transactions?limit=50` }],
        },
      ],
      errorLogs: ['Biometric authentication failed', 'Session token refresh failed'],
      crashes: {
        ios: [{ type: 'SIGTRAP', message: 'TRAP_BRKPT' }],
      },
    },
  },
  {
    serviceName: 'news-mobile',
    versions: [
      { serviceVersion: '2.14.2', buildNumber: 2142, share: 0.7 },
      { serviceVersion: '2.14.1', buildNumber: 2141, share: 0.25 },
      { serviceVersion: '2.13.0', buildNumber: 2130, share: 0.05 },
    ],
    appId: 'com.example.news',
    health: 'slow',
    sessionsPerMinute: 4,
    model: {
      screens: [
        {
          name: 'Feed',
          iosTitle: 'Top Stories',
          requests: [{ method: 'GET', url: `${NEWS_API}/api/feed?page=1` }],
          widgets: [
            {
              id: 'load-more',
              name: 'Load more',
              request: { method: 'GET', url: `${NEWS_API}/api/feed?page=2` },
            },
          ],
        },
        {
          name: 'Article',
          requests: [
            { method: 'GET', url: `${NEWS_API}/api/articles/48213` },
            { method: 'GET', url: `${NEWS_CDN}/images/48213/hero.jpg`, latencyFactor: 2 },
          ],
          widgets: [{ id: 'share', name: 'Share' }, { id: 'bookmark' }],
        },
        {
          name: 'Video',
          requests: [
            {
              method: 'GET',
              url: `${NEWS_CDN}/videos/9921/manifest.m3u8`,
              latencyFactor: 3,
              errorLog: 'Video playback failed',
            },
          ],
        },
      ],
    },
  },
  {
    serviceName: 'field-service-mobile',
    versions: [
      { serviceVersion: '0.9.4', buildNumber: 94, share: 0.7 },
      { serviceVersion: '0.9.3', buildNumber: 93, share: 0.25 },
      { serviceVersion: '0.9.0', buildNumber: 90, share: 0.05 },
    ],
    appId: 'com.example.fieldservice',
    health: 'critical',
    sessionsPerMinute: 1,
    withoutEnvironment: true,
    deviceWeights: ANDROID_ONLY,
    model: {
      screens: [
        {
          name: 'Jobs',
          requests: [{ method: 'GET', url: `${FIELD_API}/api/jobs?assigned=me` }],
          widgets: [{ id: 'job-row' }],
        },
        {
          name: 'JobDetail',
          requests: [{ method: 'GET', url: `${FIELD_API}/api/jobs/5521` }],
          widgets: [
            {
              id: 'upload-photo',
              name: 'Upload photo',
              request: {
                method: 'POST',
                url: `${FIELD_API}/api/jobs/5521/photos`,
                bodySizeBytes: 2_400_000,
                latencyFactor: 4,
                errorLog: 'Photo upload failed',
              },
            },
          ],
        },
        {
          name: 'Sync',
          requests: [
            { method: 'POST', url: `${FIELD_API}/api/sync`, errorLog: 'Offline sync failed' },
          ],
        },
      ],
      errorLogs: ['Offline sync queue overflow', 'GPS fix not available'],
    },
  },
];

// The newest native versions reach a third of their installations at the start of the run
const NEWEST_ROLLOUT = { initialAdoption: 0.35, hours: 6 };

const TRAILS_API = 'https://api.trailmap.example.com';
const RIDES_API = 'https://api.example-rides.com';
const TRANSIT_API = 'https://api.example-transit.com';

/**
 * Apps built with the native SDKs, for the proposed signals: no JavaScript runtime, so their
 * crashes are native and every iOS screen has its own title. The newest version of each app crashes
 * more and starts slower than the one before it.
 */
export const DIGITAL_EXPERIENCE_NATIVE_APPS: readonly DigitalExperienceMobileApp[] = [
  {
    serviceName: 'trailmap-android',
    versions: [
      {
        serviceVersion: '4.2.0',
        buildNumber: 420,
        share: 0.4,
        rollout: NEWEST_ROLLOUT,
        health: { crashRate: 0.14, anrRate: 0.08, coldLaunch: { median: 2600, sigma: 0.35 } },
        crashes: {
          android: [
            {
              type: 'java.lang.NullPointerException',
              message: 'Attempt to invoke virtual method on a null object reference: TrackRecorder',
            },
          ],
        },
      },
      {
        serviceVersion: '4.1.2',
        buildNumber: 412,
        share: 0.4,
        health: { crashRate: 0.05, anrRate: 0.02, coldLaunch: { median: 1400, sigma: 0.3 } },
      },
      {
        serviceVersion: '4.1.0',
        buildNumber: 410,
        share: 0.2,
        health: { crashRate: 0.06, anrRate: 0.02, coldLaunch: { median: 1500, sigma: 0.3 } },
      },
    ],
    appId: 'com.example.trailmap',
    health: 'healthy',
    sessionsPerMinute: 4,
    deviceWeights: ANDROID_ONLY,
    native: true,
    model: {
      screens: [
        {
          name: 'Map',
          iosTitle: 'Map',
          requests: [
            { method: 'GET', url: `${TRAILS_API}/v2/trails?near=me`, backend: 'trails-api' },
          ],
          widgets: [{ id: 'locate-me', name: 'Locate me' }, { id: 'filter-trails' }],
        },
        {
          name: 'TrailDetail',
          iosTitle: 'Trail',
          requests: [{ method: 'GET', url: `${TRAILS_API}/v2/trails/731`, backend: 'trails-api' }],
          widgets: [
            {
              id: 'start-recording',
              name: 'Start recording',
              request: {
                method: 'POST',
                url: `${TRAILS_API}/v2/recordings`,
                backend: 'recordings-service',
                errorLog: 'Could not start recording',
              },
            },
          ],
        },
        {
          name: 'Recordings',
          iosTitle: 'Recordings',
          requests: [
            {
              method: 'GET',
              url: `${TRAILS_API}/v2/recordings?limit=20`,
              backend: 'recordings-service',
            },
          ],
        },
      ],
      errorLogs: ['GPS signal lost', 'Offline map tile missing'],
      crashes: {
        android: [
          {
            type: 'android.database.sqlite.SQLiteException',
            message: 'database is locked (code 5 SQLITE_BUSY)',
          },
        ],
      },
    },
  },
  {
    serviceName: 'ride-ios',
    versions: [
      {
        serviceVersion: '8.5.0',
        buildNumber: 850,
        share: 0.4,
        rollout: NEWEST_ROLLOUT,
        health: { crashRate: 0.14, hangRate: 0.08, coldLaunch: { median: 2800, sigma: 0.35 } },
        crashes: { ios: [{ type: 'SIGTRAP', message: 'TRAP_BRKPT' }] },
      },
      {
        serviceVersion: '8.4.1',
        buildNumber: 841,
        share: 0.4,
        health: { crashRate: 0.05, hangRate: 0.02, coldLaunch: { median: 1300, sigma: 0.3 } },
      },
      {
        serviceVersion: '8.4.0',
        buildNumber: 840,
        share: 0.2,
        health: { crashRate: 0.06, hangRate: 0.02, coldLaunch: { median: 1400, sigma: 0.3 } },
      },
    ],
    appId: 'com.example.rides',
    health: 'healthy',
    sessionsPerMinute: 4,
    deviceWeights: IOS_ONLY,
    native: true,
    model: {
      screens: [
        {
          name: 'Home',
          iosTitle: 'Where to?',
          requests: [
            { method: 'GET', url: `${RIDES_API}/v1/nearby-drivers`, backend: 'dispatch-api' },
          ],
          widgets: [{ id: 'destination-field', name: 'Destination' }],
        },
        {
          name: 'Quote',
          iosTitle: 'Choose a ride',
          requests: [{ method: 'GET', url: `${RIDES_API}/v1/quotes`, backend: 'pricing-service' }],
          widgets: [
            {
              id: 'request-ride',
              name: 'Request ride',
              request: {
                method: 'POST',
                url: `${RIDES_API}/v1/rides`,
                backend: 'dispatch-api',
                errorLog: 'Ride request failed',
              },
            },
          ],
        },
        {
          name: 'Trip',
          iosTitle: 'Your trip',
          requests: [
            { method: 'GET', url: `${RIDES_API}/v1/rides/current`, backend: 'dispatch-api' },
          ],
        },
      ],
      errorLogs: ['Location permission revoked', 'Payment method declined'],
    },
  },
  {
    serviceName: 'transit-companion',
    versions: [
      {
        serviceVersion: '2.3.0',
        buildNumber: 230,
        share: 0.4,
        rollout: NEWEST_ROLLOUT,
        health: {
          crashRate: 0.12,
          anrRate: 0.06,
          hangRate: 0.06,
          coldLaunch: { median: 2400, sigma: 0.35 },
        },
        crashes: {
          android: [
            { type: 'java.lang.IllegalArgumentException', message: 'Invalid route id: null' },
          ],
          ios: [{ type: 'SIGTRAP', message: 'TRAP_BRKPT' }],
        },
      },
      {
        serviceVersion: '2.2.1',
        buildNumber: 221,
        share: 0.4,
        health: {
          crashRate: 0.04,
          anrRate: 0.015,
          hangRate: 0.015,
          coldLaunch: { median: 1200, sigma: 0.3 },
        },
      },
      {
        serviceVersion: '2.2.0',
        buildNumber: 220,
        share: 0.2,
        health: {
          crashRate: 0.05,
          anrRate: 0.015,
          hangRate: 0.015,
          coldLaunch: { median: 1300, sigma: 0.3 },
        },
      },
    ],
    appId: 'com.example.transit',
    health: 'healthy',
    sessionsPerMinute: 6,
    native: true,
    model: {
      screens: [
        {
          name: 'Departures',
          iosTitle: 'Departures',
          requests: [
            {
              method: 'GET',
              url: `${TRANSIT_API}/v1/departures?stop=2201`,
              backend: 'journeys-api',
            },
          ],
          widgets: [{ id: 'favorite-stop', name: 'Favorite' }],
        },
        {
          name: 'Journey',
          iosTitle: 'Journey',
          requests: [
            {
              method: 'GET',
              url: `${TRANSIT_API}/v1/journeys?from=2201&to=3310`,
              backend: 'journeys-api',
            },
          ],
          widgets: [{ id: 'swap-stops', name: 'Swap' }],
        },
        {
          name: 'Tickets',
          iosTitle: 'Tickets',
          requests: [{ method: 'GET', url: `${TRANSIT_API}/v1/tickets`, backend: 'tickets-api' }],
          widgets: [
            {
              id: 'buy-ticket',
              name: 'Buy ticket',
              request: {
                method: 'POST',
                url: `${TRANSIT_API}/v1/tickets`,
                backend: 'tickets-api',
                errorLog: 'Ticket purchase failed',
              },
            },
          ],
        },
      ],
      errorLogs: ['Timetable cache is stale'],
    },
  },
];

const parsePlatform = (value: unknown): MobilePlatformOpt => {
  if (value === undefined) {
    return DEFAULT_MOBILE_SCENARIO_OPTS.platform;
  }
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : value;
  const platform = MOBILE_PLATFORM_OPTS.find((option) => option === normalized);
  if (platform === undefined) {
    throw new Error(`platform must be ${MOBILE_PLATFORMS.join(', ')} or ${ALL_MOBILE_PLATFORMS}`);
  }
  return platform;
};

/**
 * Parses `--scenarioOpts` for `digital_experience_mobile`, rejecting unknown keys and values and
 * defaulting the seed to the run's `from`.
 */
export const parseDigitalExperienceMobileScenarioOpts = (
  opts: Record<string, unknown> | undefined,
  from: number
): DigitalExperienceMobileScenarioOpts => {
  const unknownKeys = Object.keys(opts ?? {}).filter(
    (key) => key !== 'seed' && !Object.hasOwn(DEFAULT_MOBILE_SCENARIO_OPTS, key)
  );
  if (unknownKeys.length) {
    throw new Error(`Unknown scenarioOpts: ${unknownKeys.join(', ')}`);
  }

  return {
    scale: parseScale(opts?.scale, DEFAULT_MOBILE_SCENARIO_OPTS.scale),
    seed: parseSeed(opts?.seed, getDefaultSeed(from)),
    platform: parsePlatform(opts?.platform),
    withManualSpans: parseBooleanOption(
      'withManualSpans',
      opts?.withManualSpans,
      DEFAULT_MOBILE_SCENARIO_OPTS.withManualSpans
    ),
  };
};

const NATIVE_SCENARIO_OPT_KEYS: ReadonlyArray<keyof DigitalExperienceMobileScenarioOpts> = [
  'scale',
  'seed',
  'platform',
];

/**
 * Parses `--scenarioOpts` for `digital_experience_mobile_native`, which takes `platform`, `scale`
 * and `seed`, and defaults the seed to the run's `from`.
 */
export const parseDigitalExperienceNativeScenarioOpts = (
  opts: Record<string, unknown> | undefined,
  from: number
): DigitalExperienceMobileScenarioOpts => {
  const unknownKeys = Object.keys(opts ?? {}).filter(
    (key) => !NATIVE_SCENARIO_OPT_KEYS.some((allowed) => allowed === key)
  );
  if (unknownKeys.length) {
    throw new Error(`Unknown scenarioOpts: ${unknownKeys.join(', ')}`);
  }
  return { ...parseDigitalExperienceMobileScenarioOpts(opts, from), withManualSpans: false };
};

/**
 * How often an installation opens the app. Both SDKs keep a session until it has been idle for 30
 * minutes, so this leaves more than 30 minutes between the sessions of an installation.
 */
export const MINUTES_BETWEEN_SESSIONS_OF_AN_INSTALLATION = 90;
const MIN_SCREEN_VIEWS = 2;
const MAX_SCREEN_VIEWS = 6;
// Share of sessions in which the user leaves the app and comes back within 30 minutes
const MULTI_VISIT_RATE = 0.2;
const CELLULAR_NETWORKS: Readonly<Record<MobilePlatform, readonly NetworkConnection[]>> = {
  android: [
    {
      type: 'cell',
      subtype: 'LTE',
      carrier: { name: 'T-Mobile', icc: 'us', mcc: '310', mnc: '260' },
    },
    {
      type: 'cell',
      subtype: 'NR',
      carrier: { name: 'Vodafone', icc: 'de', mcc: '262', mnc: '02' },
    },
  ],
  ios: [
    {
      type: 'cell',
      subtype: 'LTE',
      carrier: { name: 'AT&T', icc: 'us', mcc: '310', mnc: '410' },
    },
    {
      type: 'cell',
      subtype: 'NR',
      carrier: { name: 'Orange', icc: 'fr', mcc: '208', mnc: '01' },
    },
  ],
};

const withVersionCrashes = (
  model: EdotReactNativeAppModel,
  crashes: NonNullable<EdotReactNativeAppModel['crashes']>
): EdotReactNativeAppModel => ({
  ...model,
  crashes: {
    android: [...(model.crashes?.android ?? []), ...(crashes.android ?? [])],
    ios: [...(model.crashes?.ios ?? []), ...(crashes.ios ?? [])],
  },
});

/** The index of an app version, picked by the shares of the installations that run it. */
const pickVersion = (
  random: () => number,
  versions: readonly DigitalExperienceMobileAppVersion[]
): number => {
  const total = versions.reduce((sum, { share }) => sum + share, 0);
  let threshold = random() * total;
  const index = versions.findIndex(({ share }) => {
    threshold -= share;
    return threshold < 0;
  });
  return index === -1 ? versions.length - 1 : index;
};

const HOUR_MS = 60 * 60_000;

/**
 * The index of the version an installation runs `elapsed` milliseconds into the run. When the
 * newest version rolls out, it takes every installation whose turn has come, and the others pick
 * among the older versions by their shares. An installation draws the same turn and pick on every
 * session, so it only ever upgrades.
 */
const pickInstalledVersion = (
  random: () => number,
  versions: readonly DigitalExperienceMobileAppVersion[],
  elapsed: number
): number => {
  const [{ rollout }, ...older] = versions;
  if (!rollout || older.length === 0) {
    return pickVersion(random, versions);
  }
  const { initialAdoption, hours } = rollout;
  const progress = Math.min(
    initialAdoption + ((1 - initialAdoption) * Math.max(elapsed, 0)) / (hours * HOUR_MS),
    1
  );
  return random() < progress ? 0 : 1 + pickVersion(random, older);
};

type GenerateSessionsOpts = DigitalExperienceMobileScenarioOpts & {
  environment: string;
  from: number;
  /** Overrides the catalog of apps. */
  apps?: readonly DigitalExperienceMobileApp[];
};

// Native sessions are written from their start, so their launches and screen views are capped, which
// bounds how long a session lasts
const NATIVE_MAX_LAUNCH_MS = 30_000;
const NATIVE_MAX_VIEW_APPEAR_MS = 10_000;
const NATIVE_MAX_DWELL_MS = 5 * 60_000;
// Both SDKs start a new session after 30 minutes without activity
const SESSION_IDLE_TIMEOUT_MS = 30 * 60_000;
const MAX_SLOWDOWN = Math.max(
  ...Object.values(edotReactNative.deviceProfiles).map(({ slowdown }) => slowdown)
);

/**
 * The longest a native session can last: up to two visits and the relaunch that reports a crash,
 * each idle gap shorter than the SDKs' idle timeout, and the screen views of the visits plus the
 * relaunch's, with a minute to spare for rounding.
 */
const MAX_NATIVE_SESSION_MS =
  3 * NATIVE_MAX_LAUNCH_MS * MAX_SLOWDOWN +
  (MAX_SCREEN_VIEWS + 1) * (NATIVE_MAX_VIEW_APPEAR_MS * MAX_SLOWDOWN + NATIVE_MAX_DWELL_MS) +
  2 * SESSION_IDLE_TIMEOUT_MS +
  60_000;

const NATIVE_DWELL = { ...edotReactNative.defaultDwell, max: NATIVE_MAX_DWELL_MS };

const withNativeCaps = (health: MobileHealthProfile): MobileHealthProfile => ({
  ...health,
  coldLaunch: { ...health.coldLaunch, max: NATIVE_MAX_LAUNCH_MS },
  viewAppear: { ...health.viewAppear, max: NATIVE_MAX_VIEW_APPEAR_MS },
});

/** When the SDK sends a document: a span once it has ended, a crash once the next launch reports it. */
const sentAt = (event: Serializable<EdotReactNativeDocument>): number => {
  const [doc] = event.serialize();
  const time = Number(doc['@timestamp']);
  if ('kind' in doc) {
    return time + (doc.duration ?? 0) / 1_000_000;
  }
  return Math.max(time, doc.observed_timestamp ?? time);
};

const ongoingNativeSessions: OngoingSessionStore<EdotReactNativeDocument> = new Map();

/** One generator of EDOT React Native sessions per app, ending at their tick and cut off at `from`. */
export const generateEdotReactNativeSessions = (
  range: Timerange,
  opts: GenerateSessionsOpts
): Array<SynthtraceGenerator<EdotReactNativeDocument>> =>
  generateSessions(range, {
    ...opts,
    apps: opts.apps ?? DIGITAL_EXPERIENCE_MOBILE_APPS,
    proposedSignals: false,
  });

/**
 * Like {@link generateEdotReactNativeSessions} for the native apps, with every session written
 * with the proposed signals. Sessions start at their tick, from `from` on, and are written as they
 * go, so every session has its `session.start` and those still running at the end are cut off.
 * Apps passed in `apps` are generated as native apps too.
 */
export const generateEdotNativeSessions = (
  range: Timerange,
  opts: GenerateSessionsOpts
): Array<SynthtraceGenerator<EdotReactNativeDocument>> =>
  generateSessions(range, {
    ...opts,
    apps: (opts.apps ?? DIGITAL_EXPERIENCE_NATIVE_APPS).map((app) => ({ ...app, native: true })),
    proposedSignals: true,
  });

const generateSessions = (
  range: Timerange,
  {
    environment,
    from,
    scale,
    seed,
    platform,
    withManualSpans,
    apps,
    proposedSignals,
  }: GenerateSessionsOpts & {
    apps: readonly DigitalExperienceMobileApp[];
    proposedSignals: boolean;
  }
): Array<SynthtraceGenerator<EdotReactNativeDocument>> => {
  const platforms: readonly MobilePlatform[] =
    platform === ALL_MOBILE_PLATFORMS ? MOBILE_PLATFORMS : [platform];
  const runKey = JSON.stringify({ environment, from, scale, seed, platform, withManualSpans });

  return apps.map(
    ({
      serviceName,
      versions,
      appId,
      health,
      sessionsPerMinute,
      installations: installationCount,
      withoutEnvironment,
      deviceWeights,
      model,
      manualSpans = {},
      native,
    }) => {
      if (versions.slice(1).some(({ rollout }) => rollout)) {
        throw new Error(`${serviceName}: only the newest version can roll out`);
      }
      const healthProfile = edotReactNative.healthProfiles[health];
      const versionApps = versions.map(
        ({ serviceVersion, buildNumber, crashes = {}, health: versionHealth }) => ({
          app: edotReactNative.app({
            serviceName,
            serviceVersion,
            appId,
            buildNumber,
            environment: withoutEnvironment ? undefined : environment,
            native,
          }),
          model: withVersionCrashes(model, crashes),
          health: proposedSignals
            ? withNativeCaps({ ...healthProfile, ...versionHealth })
            : { ...healthProfile, ...versionHealth },
        })
      );
      const perMinute = sessionsPerMinute * scale;
      // Sessions take turns among the installations, so that each opens the app at a fixed interval
      const installations =
        installationCount ??
        Math.max(Math.ceil(perMinute * MINUTES_BETWEEN_SESSIONS_OF_AN_INSTALLATION), 1);

      // The session at `time`: it starts there with proposed signals, and ends there without
      const createSession = (index: number, time: number) => {
        // An installation keeps its device and app version across sessions
        const installationRandom = createSeededRandom(
          `${seed}:${serviceName}:installation:${index % installations}`
        );
        const profile = edotReactNative.pickDeviceProfile(
          installationRandom,
          deviceWeights,
          platforms
        );
        const [installationId, deviceId] = Array.from({ length: 2 }, () =>
          randomUuid(installationRandom)
        );
        const {
          app,
          model: versionModel,
          health: versionHealth,
        } = versionApps[pickInstalledVersion(installationRandom, versions, time - from)];

        const random = createSeededRandom(`${seed}:${serviceName}:${index}`);
        // Everything below is drawn even when it isn't used, so that options don't change the
        // rest of the draws of the session
        const sessionId = randomUuid(random);
        const screenViews =
          MIN_SCREEN_VIEWS + Math.floor(random() * (MAX_SCREEN_VIEWS - MIN_SCREEN_VIEWS + 1));
        const visits = random() < MULTI_VISIT_RATE ? 2 : 1;
        const onCellular = random() < versionHealth.cellularRate;
        const networkPick = random();
        if (!profile) {
          return [];
        }

        const networks = CELLULAR_NETWORKS[profile.platform];
        const network: NetworkConnection = onCellular
          ? networks[Math.floor(networkPick * networks.length)]
          : { type: 'wifi' };
        // The session before this one on the same installation
        const previousSessionId =
          proposedSignals && index >= installations
            ? randomUuid(createSeededRandom(`${seed}:${serviceName}:${index - installations}`))
            : undefined;
        return edotReactNative.session({
          client: app.client(profile, { installationId, sessionId, deviceId, network }),
          app: versionModel,
          health: versionHealth,
          screenViews,
          visits,
          manualSpans: withManualSpans ? manualSpans : {},
          proposedSignals,
          previousSessionId,
          random,
          ...(proposedSignals ? { start: time, dwell: NATIVE_DWELL } : { end: time }),
        });
      };

      if (proposedSignals) {
        return generateOngoingPerMinute(range, perMinute, {
          store: ongoingNativeSessions,
          key: `${runKey}:${serviceName}`,
          maxDuration: MAX_NATIVE_SESSION_MS,
          releaseTime: sentAt,
          // A session that started before the run is left out whole
          create: ({ time, index }) => (time < from ? [] : createSession(index, time)),
        });
      }
      return generatePerMinute<EdotReactNativeDocument>(range, perMinute, ({ time, index }) =>
        createSession(index, time).filter((event) => getTimestamp(event) >= from)
      );
    }
  );
};
