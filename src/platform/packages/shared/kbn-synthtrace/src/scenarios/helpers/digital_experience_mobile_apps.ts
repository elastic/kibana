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
  type DeviceProfileId,
  type EdotReactNativeAppModel,
  type EdotReactNativeDocument,
  type HealthProfileName,
  type MobilePlatform,
  type NetworkConnection,
  type SynthtraceGenerator,
  type Timerange,
} from '@kbn/synthtrace-client';
import {
  generatePerMinute,
  getDefaultSeed,
  getTimestamp,
  parseBooleanOption,
  parseScale,
  parseSeed,
  randomUuid,
} from './digital_experience_apps';

export interface DigitalExperienceMobileAppVersion {
  serviceVersion: string;
  buildNumber: number;
  /** Share of the installations that run this version. */
  share: number;
  /** Crashes only this version has, on top of the app's. */
  crashes?: EdotReactNativeAppModel['crashes'];
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
}

export type MobilePlatformOpt = MobilePlatform | 'both';

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
  platform: 'both',
  withManualSpans: true,
};

const WEATHER_API = 'https://weather-api.example.com';
const SHOP_API = 'https://api.example-store.com';
const BANK_API = 'https://api.example-bank.com';
const NEWS_API = 'https://api.example-news.com';
const NEWS_CDN = 'https://media.example-news.com';
const FIELD_API = 'https://field.example-utilities.com';

const ANDROID_ONLY: Partial<Record<DeviceProfileId, number>> = {
  iphone15ProIos18: 0,
  iphone12Ios17: 0,
  ipadAirIpados18: 0,
};

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

const parsePlatform = (value: unknown): MobilePlatformOpt => {
  if (value === undefined) {
    return DEFAULT_MOBILE_SCENARIO_OPTS.platform;
  }
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : value;
  if (normalized === 'android' || normalized === 'ios' || normalized === 'both') {
    return normalized;
  }
  throw new Error('platform must be android, ios or both');
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

/** One generator of EDOT React Native sessions per app, ending at their tick and cut off at `from`. */
export const generateEdotReactNativeSessions = (
  range: Timerange,
  {
    environment,
    from,
    scale,
    seed,
    platform,
    withManualSpans,
    apps = DIGITAL_EXPERIENCE_MOBILE_APPS,
  }: DigitalExperienceMobileScenarioOpts & {
    environment: string;
    from: number;
    apps?: readonly DigitalExperienceMobileApp[];
  }
): Array<SynthtraceGenerator<EdotReactNativeDocument>> => {
  const platforms: readonly MobilePlatform[] =
    platform === 'both' ? ['android', 'ios'] : [platform];

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
    }) => {
      const versionApps = versions.map(({ serviceVersion, buildNumber, crashes = {} }) => ({
        app: edotReactNative.app({
          serviceName,
          serviceVersion,
          appId,
          buildNumber,
          environment: withoutEnvironment ? undefined : environment,
        }),
        model: withVersionCrashes(model, crashes),
      }));
      const healthProfile = edotReactNative.healthProfiles[health];
      const perMinute = sessionsPerMinute * scale;
      // Sessions take turns among the installations, so that each opens the app at a fixed interval
      const installations =
        installationCount ??
        Math.max(Math.ceil(perMinute * MINUTES_BETWEEN_SESSIONS_OF_AN_INSTALLATION), 1);

      return generatePerMinute<EdotReactNativeDocument>(range, perMinute, ({ time, index }) => {
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
        const { app, model: versionModel } = versionApps[pickVersion(installationRandom, versions)];

        const random = createSeededRandom(`${seed}:${serviceName}:${index}`);
        // Everything below is drawn even when it isn't used, so that options don't change the
        // rest of the draws of the session
        const sessionId = randomUuid(random);
        const screenViews =
          MIN_SCREEN_VIEWS + Math.floor(random() * (MAX_SCREEN_VIEWS - MIN_SCREEN_VIEWS + 1));
        const visits = random() < MULTI_VISIT_RATE ? 2 : 1;
        const onCellular = random() < healthProfile.cellularRate;
        const networkPick = random();
        if (!profile) {
          return [];
        }

        const networks = CELLULAR_NETWORKS[profile.platform];
        const network: NetworkConnection = onCellular
          ? networks[Math.floor(networkPick * networks.length)]
          : { type: 'wifi' };
        const events = edotReactNative.session({
          client: app.client(profile, { installationId, sessionId, deviceId, network }),
          app: versionModel,
          health: healthProfile,
          screenViews,
          visits,
          manualSpans: withManualSpans ? manualSpans : {},
          random,
          end: time,
        });
        return events.filter((event) => getTimestamp(event) >= from);
      });
    }
  );
};
