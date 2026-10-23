/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { v4 as generateUuid } from 'uuid';
import {
  edotBrowser,
  type BrowserProfileId,
  type EdotBrowserDocument,
  type EdotBrowserEvent,
  type EdotBrowserSite,
  type Fields,
  type HealthProfileName,
  type Serializable,
  type SynthtraceGenerator,
  type Timerange,
} from '@kbn/synthtrace-client';
import { createSeededRandom } from '../../lib/utils/seeded_random';

export interface DigitalExperienceApp {
  serviceName: string;
  serviceVersion: string;
  health: HealthProfileName;
  sessionsPerMinute: number;
  site: EdotBrowserSite;
  browserWeights?: Partial<Record<BrowserProfileId, number>>;
}

export interface DigitalExperienceScenarioOpts {
  /** Write `attributes.session.id`. Turn off to match EDOT Browser `main`, which doesn't emit it yet. */
  withSessionId: boolean;
  /** Write the web vital attribution as a JSON body, which EDOT Browser only does when opted in. */
  includeRawAttribution: boolean;
  /**
   * Multiplies the number of sessions per minute of every app. Fractions of a session add up over
   * time, so a scale below 1 thins out every app in proportion.
   */
  scale: number;
  /**
   * Makes the data reproducible: every session, with its IDs, browser, page views and events, is
   * derived from the seed, its app and its number since the epoch. Random when unset.
   */
  seed?: string;
}

const DEFAULT_SCENARIO_OPTS: DigitalExperienceScenarioOpts = {
  withSessionId: true,
  includeRawAttribution: false,
  scale: 1,
  seed: undefined,
};

const STOREFRONT_ORIGIN = 'https://www.example-store.com';
const CHECKOUT_ORIGIN = 'https://checkout.example-store.com';
const MEDIA_ORIGIN = 'https://www.example-news.com';
const SUPPORT_ORIGIN = 'https://support.example-saas.com';
const DOCS_ORIGIN = 'https://docs.example-saas.com';

export const DIGITAL_EXPERIENCE_APPS: readonly DigitalExperienceApp[] = [
  {
    serviceName: 'storefront-web',
    serviceVersion: '4.12.0',
    health: 'healthy',
    sessionsPerMinute: 6,
    site: {
      origin: STOREFRONT_ORIGIN,
      resources: [
        {
          path: '/assets/js/main.3f9a1c.js',
          initiatorType: 'script',
          sizeBytes: 310_000,
          renderBlocking: true,
        },
        {
          path: '/assets/css/main.81bd02.css',
          initiatorType: 'link',
          sizeBytes: 45_000,
          renderBlocking: true,
        },
      ],
      pages: [
        {
          path: '/',
          resources: [
            { path: '/assets/img/hero-autumn.webp', initiatorType: 'img', sizeBytes: 180_000 },
          ],
          requests: [{ method: 'GET', url: `${STOREFRONT_ORIGIN}/api/recommendations` }],
        },
        {
          path: '/products',
          requests: [{ method: 'GET', url: `${STOREFRONT_ORIGIN}/api/products?page=1` }],
        },
        {
          path: '/products/trail-running-shoes',
          resources: [
            { path: '/assets/img/products/trail-1.webp', initiatorType: 'img', sizeBytes: 120_000 },
          ],
          requests: [
            { method: 'GET', url: `${STOREFRONT_ORIGIN}/api/products/trail-running-shoes` },
          ],
          clickTargets: [
            {
              tagName: 'BUTTON',
              cssSelector: '#add-to-cart',
              otelAttributes: { action: 'add-to-cart' },
              request: { method: 'POST', url: `${STOREFRONT_ORIGIN}/api/cart/items` },
            },
            { tagName: 'IMG', cssSelector: 'div.gallery > img:nth-child(2)' },
          ],
        },
        {
          path: '/cart',
          requests: [{ method: 'GET', url: `${STOREFRONT_ORIGIN}/api/cart` }],
          clickTargets: [
            {
              tagName: 'A',
              cssSelector: 'a.checkout-button',
            },
          ],
        },
      ],
    },
  },
  {
    serviceName: 'checkout-web',
    serviceVersion: '2.3.1',
    health: 'erroring',
    sessionsPerMinute: 4,
    site: {
      origin: CHECKOUT_ORIGIN,
      resources: [
        {
          path: '/static/js/checkout.c02e7f.js',
          initiatorType: 'script',
          sizeBytes: 260_000,
          renderBlocking: true,
        },
        { path: 'https://js.example-payments.com/v3/', initiatorType: 'script', sizeBytes: 95_000 },
      ],
      pages: [
        {
          path: '/checkout/shipping',
          requests: [
            {
              method: 'GET',
              url: `${CHECKOUT_ORIGIN}/api/checkout/session`,
              instrumentation: 'xhr',
            },
          ],
          clickTargets: [
            {
              tagName: 'BUTTON',
              cssSelector: '#continue-to-payment',
            },
          ],
        },
        {
          path: '/checkout/payment',
          requests: [{ method: 'GET', url: `${CHECKOUT_ORIGIN}/api/payment/methods` }],
          clickTargets: [
            {
              tagName: 'BUTTON',
              cssSelector: '#pay-now',
              otelAttributes: { action: 'pay', step: 'payment' },
              request: {
                method: 'POST',
                url: `${CHECKOUT_ORIGIN}/api/payment`,
                failureRate: 0.15,
                failureStatusCodes: [500, 502, 503],
                latencyFactor: 3,
              },
            },
          ],
        },
        {
          path: '/checkout/confirmation',
          requests: [{ method: 'GET', url: `${CHECKOUT_ORIGIN}/api/orders/latest` }],
        },
      ],
      exceptions: [
        {
          type: 'TypeError',
          message: "Cannot read properties of undefined (reading 'paymentMethod')",
        },
        { type: 'TypeError', message: "Failed to execute 'postMessage' on 'Window'" },
      ],
    },
  },
  {
    serviceName: 'media-portal-web',
    serviceVersion: '7.0.4',
    health: 'slow',
    sessionsPerMinute: 4,
    site: {
      origin: MEDIA_ORIGIN,
      resources: [
        {
          path: 'https://fonts.example-cdn.com/css2?family=Merriweather',
          initiatorType: 'link',
          sizeBytes: 12_000,
          renderBlocking: true,
          durationFactor: 2,
        },
        {
          path: '/static/css/article.5d77aa.css',
          initiatorType: 'link',
          sizeBytes: 160_000,
          renderBlocking: true,
          durationFactor: 2,
        },
        { path: '/static/js/player.ef01c9.js', initiatorType: 'script', sizeBytes: 780_000 },
      ],
      pages: [
        {
          path: '/',
          resources: [
            {
              path: '/images/front/lead-story.jpg',
              initiatorType: 'img',
              sizeBytes: 2_400_000,
              durationFactor: 4,
            },
          ],
          requests: [{ method: 'GET', url: `${MEDIA_ORIGIN}/api/headlines` }],
        },
        {
          path: '/articles/2026/10/city-council-approves-new-bike-lanes',
          resources: [
            {
              path: '/images/articles/bike-lanes.jpg',
              initiatorType: 'img',
              sizeBytes: 1_800_000,
              durationFactor: 4,
            },
          ],
          requests: [
            {
              method: 'GET',
              url: `${MEDIA_ORIGIN}/api/comments?article=bike-lanes`,
              latencyFactor: 2,
            },
          ],
        },
        {
          path: '/video/weekly-roundup',
          resources: [
            {
              path: '/images/video/roundup-poster.jpg',
              initiatorType: 'img',
              sizeBytes: 900_000,
              durationFactor: 3,
            },
          ],
          clickTargets: [
            {
              tagName: 'BUTTON',
              cssSelector: 'button.vjs-play-control',
            },
          ],
        },
      ],
    },
  },
  {
    serviceName: 'support-center-web',
    serviceVersion: '0.9.3',
    health: 'critical',
    sessionsPerMinute: 2,
    site: {
      origin: SUPPORT_ORIGIN,
      resources: [
        {
          path: '/bundle/app.js',
          initiatorType: 'script',
          sizeBytes: 1_900_000,
          renderBlocking: true,
        },
        {
          path: '/bundle/app.css',
          initiatorType: 'link',
          sizeBytes: 220_000,
          renderBlocking: true,
        },
      ],
      pages: [
        {
          path: '/tickets',
          requests: [
            {
              method: 'GET',
              url: `${SUPPORT_ORIGIN}/api/tickets?status=open`,
              instrumentation: 'xhr',
            },
          ],
        },
        {
          path: '/tickets/new',
          clickTargets: [
            {
              tagName: 'BUTTON',
              cssSelector: '#submit-ticket',
              otelAttributes: { action: 'submit-ticket' },
              request: {
                method: 'POST',
                url: `${SUPPORT_ORIGIN}/api/tickets`,
                instrumentation: 'xhr',
              },
            },
            {
              tagName: 'TEXTAREA',
              cssSelector: '#ticket-description',
            },
          ],
        },
        {
          path: '/kb/reset-password',
          requests: [{ method: 'GET', url: `${SUPPORT_ORIGIN}/api/kb/articles/reset-password` }],
        },
      ],
      exceptions: [
        { type: 'Error', message: 'ResizeObserver loop completed with undelivered notifications.' },
        { type: 'TypeError', message: "Cannot read properties of null (reading 'focus')" },
        { type: 'RangeError', message: 'Maximum call stack size exceeded' },
      ],
    },
  },
  {
    serviceName: 'docs-web',
    serviceVersion: '1.0.0',
    health: 'healthy',
    sessionsPerMinute: 1,
    browserWeights: {
      chromeMacos: 45,
      edgeWindows: 25,
      firefoxLinux: 20,
      safariIos: 6,
      chromeAndroid: 4,
    },
    site: {
      origin: DOCS_ORIGIN,
      resources: [
        { path: '/_next/static/chunks/main.js', initiatorType: 'script', sizeBytes: 90_000 },
        {
          path: '/_next/static/css/docs.css',
          initiatorType: 'link',
          sizeBytes: 30_000,
          renderBlocking: true,
        },
      ],
      pages: [
        { path: '/' },
        { path: '/guides/getting-started' },
        { path: '/api-reference/webhooks' },
        {
          path: '/search?q=webhooks',
          requests: [{ method: 'GET', url: `${DOCS_ORIGIN}/api/search?q=webhooks` }],
        },
      ],
    },
  },
];

type BooleanOptKey = 'withSessionId' | 'includeRawAttribution';

const parseBooleanOpt = (
  opts: Record<string, unknown> | undefined,
  key: BooleanOptKey
): boolean => {
  const value = opts?.[key];
  if (value === undefined) {
    return DEFAULT_SCENARIO_OPTS[key];
  }
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : value;
  if (normalized === true || normalized === 'true') {
    return true;
  }
  if (normalized === false || normalized === 'false') {
    return false;
  }
  throw new Error(`${key} must be true or false`);
};

const parseScale = (value: unknown): number => {
  if (value === undefined) {
    return DEFAULT_SCENARIO_OPTS.scale;
  }
  const scale = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  if (typeof scale !== 'number' || !Number.isFinite(scale) || scale <= 0) {
    throw new Error('scale must be a positive number');
  }
  return scale;
};

const parseSeed = (value: unknown): string | undefined => {
  if (value === undefined) {
    return DEFAULT_SCENARIO_OPTS.seed;
  }
  if ((typeof value === 'string' && value.trim() !== '') || Number.isFinite(value)) {
    return String(value);
  }
  throw new Error('seed must be a non-empty string or a finite number');
};

/** Parses `--scenarioOpts` for the digital experience scenarios, rejecting unknown keys and values. */
export const parseDigitalExperienceScenarioOpts = (
  opts: Record<string, unknown> | undefined
): DigitalExperienceScenarioOpts => {
  const unknownKeys = Object.keys(opts ?? {}).filter(
    (key) => !Object.hasOwn(DEFAULT_SCENARIO_OPTS, key)
  );
  if (unknownKeys.length) {
    throw new Error(`Unknown scenarioOpts: ${unknownKeys.join(', ')}`);
  }

  return {
    withSessionId: parseBooleanOpt(opts, 'withSessionId'),
    includeRawAttribution: parseBooleanOpt(opts, 'includeRawAttribution'),
    scale: parseScale(opts?.scale),
    seed: parseSeed(opts?.seed),
  };
};

const MIN_PAGE_VIEWS = 1;
const MAX_PAGE_VIEWS = 5;

const MS_PER_MINUTE = 60_000;

/** The number of events of a per-minute rate that start in `[from, to)`, counted from the epoch. */
const countInWindow = (perMinute: number, from: number, to: number): number =>
  Math.floor((perMinute * to) / MS_PER_MINUTE) - Math.floor((perMinute * from) / MS_PER_MINUTE);

/**
 * Generates `perMinute` events a minute over `range`, calling `create` for each of them with its
 * time and its index, counted from the epoch. Events are placed by their absolute time, evenly
 * apart, so the rate holds and the same event comes out at the same time for any batch size, from
 * the one-second batches of live mode to runs of less than a minute. Times are never in the future
 * of `range.to`.
 */
export const generatePerMinute = <TFields extends Fields>(
  range: Timerange,
  perMinute: number,
  create: (event: {
    time: number;
    index: number;
  }) => Serializable<TFields> | Array<Serializable<TFields>>
): SynthtraceGenerator<TFields> => {
  const to = range.to.getTime();

  return range.interval('1s').generator<TFields>((windowStart, _index, { stepMilliseconds }) => {
    const windowEnd = Math.min(windowStart + stepMilliseconds, to);
    const eventCount = countInWindow(perMinute, windowStart, windowEnd);
    if (eventCount === 0) {
      return [];
    }
    const firstIndex = Math.floor((perMinute * windowStart) / MS_PER_MINUTE);

    return Array.from({ length: eventCount }, (_, offset) => {
      const index = firstIndex + offset;
      // The event happens when the rate reaches the next whole event, within the window
      const time = Math.ceil(((index + 1) * MS_PER_MINUTE) / perMinute) - 1;
      return create({ time: Math.min(Math.max(time, windowStart), windowEnd - 1), index });
    }).flat();
  });
};

/** A random v4 UUID, like the `crypto.randomUUID()` EDOT Browser takes its IDs from. */
const randomUuid = (random: () => number): string =>
  generateUuid({ random: Uint8Array.from({ length: 16 }, () => Math.floor(random() * 256)) });

const getTimestamp = (event: EdotBrowserEvent) => Number(event.serialize()[0]['@timestamp']);

/**
 * One generator per app in the catalogue, each producing EDOT Browser sessions over `range`.
 * Sessions end at the time of their rate tick, so live mode never writes into the future.
 * Sessions that started before the run's `from` are cut off there, like traffic at the edge of any
 * window.
 */
export const generateEdotBrowserSessions = (
  range: Timerange,
  {
    environment,
    from,
    withSessionId,
    includeRawAttribution,
    scale,
    seed = String(Math.random()),
  }: DigitalExperienceScenarioOpts & { environment: string; from: number }
): Array<SynthtraceGenerator<EdotBrowserDocument>> =>
  DIGITAL_EXPERIENCE_APPS.map(
    ({ serviceName, serviceVersion, health, sessionsPerMinute, site, browserWeights }) => {
      const app = edotBrowser.app({ serviceName, serviceVersion, environment });

      return generatePerMinute<EdotBrowserDocument>(
        range,
        sessionsPerMinute * scale,
        ({ time, index }) => {
          const random = createSeededRandom(`${seed}:${serviceName}:${index}`);
          const pageViews =
            MIN_PAGE_VIEWS + Math.floor(random() * (MAX_PAGE_VIEWS - MIN_PAGE_VIEWS + 1));
          const profile = edotBrowser.pickBrowserProfile(random, browserWeights);
          // Drawn even without session IDs, so that the option doesn't change the rest of the data
          const sessionId = randomUuid(random);

          return edotBrowser
            .session({
              client: app.client(profile, {
                sessionId: withSessionId ? sessionId : undefined,
                includeRawAttribution,
              }),
              site,
              health: edotBrowser.healthProfiles[health],
              end: time,
              pageViews,
              random,
            })
            .filter((event) => getTimestamp(event) >= from);
        }
      );
    }
  );
