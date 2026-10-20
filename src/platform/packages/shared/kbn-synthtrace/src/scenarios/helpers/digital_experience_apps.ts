/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  edotBrowser,
  generateLongId,
  type BrowserProfileId,
  type EdotBrowserDocument,
  type EdotBrowserSite,
  type HealthProfileName,
  type SynthtraceGenerator,
  type Timerange,
} from '@kbn/synthtrace-client';
import { getBooleanOpt, getNumberOpt } from './scenario_opts_helpers';

export interface DigitalExperienceApp {
  serviceName: string;
  serviceVersion: string;
  health: HealthProfileName;
  sessionsPerMinute: number;
  site: EdotBrowserSite;
  browserWeights?: Partial<Record<BrowserProfileId, number>>;
}

export interface DigitalExperienceScenarioOpts {
  /** Write `attributes.session.id`, which EDOT Browser `main` does not emit yet. */
  withSessionId: boolean;
  /** Multiplies the number of sessions per minute of every app. */
  scale: number;
}

const DEFAULT_SCENARIO_OPTS: DigitalExperienceScenarioOpts = {
  withSessionId: false,
  scale: 1,
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
              elementAttributes: { id: 'add-to-cart', 'data-test-subj': 'addToCart' },
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
              elementAttributes: { href: `${CHECKOUT_ORIGIN}/checkout/shipping` },
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
              elementAttributes: { id: 'continue-to-payment' },
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
              elementAttributes: { id: 'pay-now', type: 'submit' },
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
              elementAttributes: { title: 'Play' },
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
              elementAttributes: { id: 'submit-ticket' },
              request: {
                method: 'POST',
                url: `${SUPPORT_ORIGIN}/api/tickets`,
                instrumentation: 'xhr',
              },
            },
            {
              tagName: 'TEXTAREA',
              cssSelector: '#ticket-description',
              elementAttributes: { id: 'ticket-description' },
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

/** Parses `--scenarioOpts` for the digital experience scenarios, rejecting unknown keys. */
export const parseDigitalExperienceScenarioOpts = (
  opts: Record<string, unknown> | undefined
): DigitalExperienceScenarioOpts => {
  const unknownKeys = Object.keys(opts ?? {}).filter((key) => !(key in DEFAULT_SCENARIO_OPTS));
  if (unknownKeys.length) {
    throw new Error(`Unknown scenarioOpts: ${unknownKeys.join(', ')}`);
  }

  const scale = getNumberOpt(opts, 'scale', DEFAULT_SCENARIO_OPTS.scale);
  if (scale <= 0) {
    throw new Error('scale must be a positive number');
  }

  return {
    withSessionId: getBooleanOpt(opts, 'withSessionId', DEFAULT_SCENARIO_OPTS.withSessionId),
    scale,
  };
};

const MIN_PAGE_VIEWS = 1;
const MAX_PAGE_VIEWS = 5;
const MIN_PAGE_VIEW_MS = 8_000;
const MAX_PAGE_VIEW_MS = 20_000;

/** One generator per app in the catalogue, each producing EDOT Browser sessions over `range`. */
export const generateEdotBrowserSessions = (
  range: Timerange,
  { environment, withSessionId, scale }: DigitalExperienceScenarioOpts & { environment: string }
): Array<SynthtraceGenerator<EdotBrowserDocument>> =>
  DIGITAL_EXPERIENCE_APPS.map(
    ({ serviceName, serviceVersion, health, sessionsPerMinute, site, browserWeights }) => {
      const app = edotBrowser.app({ serviceName, serviceVersion, environment });

      return range
        .interval('1m')
        .rate(Math.max(1, Math.round(sessionsPerMinute * scale)))
        .generator((timestamp, _index, { stepMilliseconds }) => {
          const pageViews =
            MIN_PAGE_VIEWS + Math.floor(Math.random() * (MAX_PAGE_VIEWS - MIN_PAGE_VIEWS + 1));
          const pageViewMs =
            MIN_PAGE_VIEW_MS + Math.random() * (MAX_PAGE_VIEW_MS - MIN_PAGE_VIEW_MS);
          const sessionDurationMs = Math.round(pageViews * pageViewMs);
          // Sessions end by `timestamp`, which live mode keeps at or before now
          const sessionEnd = timestamp - Math.floor(Math.random() * stepMilliseconds);

          return edotBrowser.session({
            client: app.client(
              edotBrowser.pickBrowserProfile(Math.random, browserWeights),
              withSessionId ? { sessionId: generateLongId() } : {}
            ),
            site,
            health: edotBrowser.healthProfiles[health],
            start: sessionEnd - sessionDurationMs,
            pageViews,
            sessionDurationMs,
          });
        });
    }
  );
