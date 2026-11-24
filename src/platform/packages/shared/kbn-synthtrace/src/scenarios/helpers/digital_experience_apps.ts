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
  createSeededRandom,
  edotBrowser,
  type BrowserProfileId,
  type EdotBrowserDocument,
  type EdotBrowserClientOptions,
  type EdotBrowserEvent,
  type EdotBrowserExceptionTemplate,
  type EdotBrowserOutage,
  type EdotBrowserPage,
  type EdotBrowserRatedException,
  type EdotBrowserReplayVisit,
  type EdotBrowserRequest,
  type EdotBrowserSite,
  type EdotBrowserUser,
  type Fields,
  type HealthProfileName,
  type ReplaySize,
  type Serializable,
  type SynthtraceGenerator,
  type Timerange,
} from '@kbn/synthtrace-client';
import { DIGITAL_EXPERIENCE_EDGE_CASES } from './digital_experience_edge_cases';

export interface DigitalExperienceEnvironment {
  /** Unset for traffic that reports no environment, like apps that don't set one. */
  name?: string;
  /** Share of the app's sessions that happen here, relative to its other environments. */
  weight: number;
  /** Uncaught exceptions that only happen in this environment, on top of the app's own. */
  exceptions?: readonly EdotBrowserExceptionTemplate[];
  /** The app doesn't report uncaught exceptions here, like a preview without error tracking. */
  withoutExceptions?: boolean;
  /** The app doesn't report resource timings here. */
  withoutResourceTimings?: boolean;
}

/** A release of an app that some of its sessions run, written as `service.version`. */
export interface DigitalExperienceVersion {
  version: string;
  /** Share of the app's sessions that run it, relative to its other versions. */
  weight: number;
  /**
   * Uncaught exceptions that clicking an element throws in this version only, by the element's
   * CSS selector: a regression of the release, or a bug that it fixed.
   */
  clickExceptions?: Readonly<Record<string, readonly EdotBrowserRatedException[]>>;
}

/**
 * An outage of one endpoint of the app, which happens once in every period of `everyHours`, at a
 * time drawn from the seed, for `minutes`. The requests to the endpoint sent during it get its
 * failures.
 */
export interface DigitalExperienceIncident {
  /** The URL of the request that fails, as the site's pages and click targets write it. */
  url: string;
  failureRate: number;
  failureStatusCodes: readonly number[];
  everyHours: number;
  minutes: readonly [min: number, max: number];
}

export interface DigitalExperienceApp {
  serviceName: string;
  /** The releases the app's sessions run, like a rollout in progress. */
  versions: readonly [DigitalExperienceVersion, ...DigitalExperienceVersion[]];
  health: HealthProfileName;
  incident?: DigitalExperienceIncident;
  sessionsPerMinute: number;
  /** Share of sessions (0 to 1) with a signed-in user; the others are anonymous. */
  signedInRate: number;
  /** The organizations of a B2B app's users, written as `elastic.user.account`. */
  accounts?: readonly string[];
  /** Omits `deployment.environment.name`, for lists that group apps by environment. */
  withoutEnvironment?: boolean;
  /**
   * Where the app runs when the `environments` option is on, with the share of its traffic in
   * each. Without it, all of it happens in the scenario's single environment.
   */
  environments?: readonly DigitalExperienceEnvironment[];
  site: EdotBrowserSite;
  browserWeights?: Partial<Record<BrowserProfileId, number>>;
}

export interface DigitalExperienceScenarioOpts {
  /**
   * Write `attributes.session.id`, with the tab ID and `session.start` that come with sessions.
   * Turn off to match EDOT Browser 0.3.0 and earlier: the apps then report distro version 0.3.0
   * instead of 0.4.0.
   */
  withSessionId: boolean;
  /** Write the web vital attribution as a JSON body, which EDOT Browser only does when opted in. */
  includeRawAttribution: boolean;
  /**
   * Spread each app's traffic over several environments (production, staging and a preview
   * without error tracking) instead of the scenario's single one.
   */
  environments: boolean;
  /**
   * Add what is far from the usual to the apps: URLs of thousands of characters, stack traces of
   * dozens of frames and one that is over 8,191 characters, errors with no type or no stack, more
   * than 100 distinct stack traces in one app, browsers that EDOT Browser can't identify, and
   * clicks on elements with no selector. To see all the stack traces of the app that has them, use a
   * `scale` of 3 for an hour, or run for several hours.
   */
  edgeCases: boolean;
  /**
   * Share of sessions (0 to 1) recorded for session replay from the start of every page load, like
   * `replay.sampleRate` of EDOT Browser. A session's replay records carry its `session.id`.
   */
  replayRate: number;
  /**
   * Share of the other sessions (0 to 1) that start recording when they hit their first uncaught
   * exception, like `replay.errorSampleRate`. The ones that never hit one have no replay.
   */
  errorReplayRate: number;
  /** How much a recorded session weighs: `light` (~50 KB), `typical` (~0.5 MB) or `heavy` (4 to 5 MB). */
  replaySize: ReplaySize;
  /**
   * How long sessions run: `typical` (1 to 5 page views, seconds to a few minutes), `long` (15 to
   * 40 page views, mostly 15 to 40 minutes) or `marathon` (60 to 120 page views, mostly 30 minutes
   * to 2 hours). A session ends at the time it is generated for, so a range shorter than the
   * session cuts off its start, and replay leaves out the page loads that started before the range.
   * A session's replay is built in memory before it is written: with `marathon` its bodies weigh
   * about 2 MB (`light`), 15 MB (`typical`) or 90 MB (`heavy`) at the median, and up to 175 MB.
   */
  sessionLength: SessionLength;
  /**
   * Start every session at the time it is generated for, instead of ending it there, and write its
   * events as they happen: in live mode a session then grows minute by minute for as long as it
   * runs, instead of showing up whole when it ends. Sessions that started before the run's start
   * are written from there on, so the run starts with the sessions in progress at that time.
   */
  ongoingSessions: boolean;
  /**
   * Multiplies the number of sessions per minute of every app. Fractions of a session add up over
   * time, so a scale below 1 thins out every app in proportion.
   */
  scale: number;
  /**
   * Makes the data reproducible: every session, with its IDs, browser, page views and events, is
   * derived from the seed, its app and its number since the epoch. The parser defaults it to
   * {@link getDefaultSeed}.
   */
  seed: string;
  /**
   * Share of sessions (0 to 1) with a signed-in user in every app, instead of each app's own share.
   * Users need sessions: with `withSessionId` off, every session is anonymous.
   */
  signedInRate?: number;
  /**
   * Report rage, dead and error clicks, like EDOT Browser's frustration detection, which is on by
   * default. Like users, they need sessions: with `withSessionId` off, there are none.
   */
  frustration: boolean;
}

const DEFAULT_SCENARIO_OPTS: Omit<DigitalExperienceScenarioOpts, 'seed'> = {
  withSessionId: true,
  includeRawAttribution: false,
  environments: false,
  edgeCases: false,
  replayRate: 0,
  errorReplayRate: 0,
  replaySize: 'typical',
  sessionLength: 'typical',
  ongoingSessions: false,
  scale: 1,
  signedInRate: undefined,
  frustration: true,
};

export const PRODUCTION_ENVIRONMENT = 'production';
const STAGING_ENVIRONMENT = 'staging';
const PREVIEW_ENVIRONMENT = 'preview';

const STOREFRONT_ORIGIN = 'https://www.example-store.com';
const CHECKOUT_ORIGIN = 'https://checkout.example-store.com';
const MEDIA_ORIGIN = 'https://www.example-news.com';
const SUPPORT_ORIGIN = 'https://support.example-saas.com';
const DOCS_ORIGIN = 'https://docs.example-saas.com';

// The organizations that use the SaaS apps
const SAAS_ACCOUNTS = ['acme', 'globex', 'initech', 'umbrella', 'hooli', 'stark-industries'];

// Third parties that several apps embed
const ANALYTICS_SCRIPT = 'https://www.example-analytics.com/collect.js';
const STORE_CDN_ORIGIN = 'https://images.example-cdn.net';

// Errors of the page that don't depend on the app, as every site sees them in production
const PRODUCTION_EXCEPTIONS: readonly EdotBrowserExceptionTemplate[] = [
  {
    type: 'NotFoundError',
    message: "Failed to execute 'removeChild' on 'Node': The node to be removed is not a child.",
    weight: 2,
    stacks: [[{ functionName: 'removeChild' }, { functionName: 'commitDeletion' }]],
  },
];

// Code that is only deployed to staging, behind a feature flag that production doesn't know yet
const stagingExperiment = (flag: string): EdotBrowserExceptionTemplate => ({
  type: 'Error',
  message: `Feature flag "${flag}" is not registered`,
  weight: 4,
  stacks: [[{ functionName: 'FeatureFlags.get' }, { functionName: 'useFeatureFlag' }]],
});

// Safari in private browsing has no room in localStorage, so whatever writes to it throws
const PRIVATE_BROWSING_STORAGE_ERROR: EdotBrowserRatedException = {
  type: 'QuotaExceededError',
  message: 'The quota has been exceeded.',
  engines: ['webkit'],
  rate: 0.15,
  persistent: true,
  stacks: [[{ functionName: 'persistCart' }, { functionName: 'async addToCart' }]],
};

export const DIGITAL_EXPERIENCE_APPS: readonly DigitalExperienceApp[] = [
  {
    serviceName: 'storefront-web',
    versions: [
      {
        version: '4.12.0',
        weight: 55,
        // Tabs opened before 4.13.0 shipped ask for a chunk of the cart drawer that is gone
        clickExceptions: {
          '#add-to-cart': [
            {
              type: 'ChunkLoadError',
              message: `Loading chunk 318 failed.\n(missing: ${STOREFRONT_ORIGIN}/assets/js/chunk-cart-drawer.2b97a0.js)`,
              rate: 0.05,
              stacks: [
                [
                  { functionName: 'onScriptComplete', file: '/assets/js/vendors-react.9d4e7b.js' },
                  { functionName: 'async CartDrawer.open' },
                ],
              ],
            },
          ],
        },
      },
      {
        version: '4.13.0',
        weight: 45,
        // The new size picker leaves the variant unset for products that come in a single size
        clickExceptions: {
          '#add-to-cart': edotBrowser.readPropertyErrors(
            { variable: 'variant', property: 'sku' },
            {
              rate: 0.2,
              persistent: true,
              stacks: [
                [
                  { functionName: 'toCartItem' },
                  { functionName: 'async addToCart' },
                  { functionName: 'async ProductActions.onAddToCart' },
                ],
              ],
            }
          ),
        },
      },
    ],
    health: 'healthy',
    incident: {
      url: `${STOREFRONT_ORIGIN}/api/cart/items`,
      failureRate: 0.9,
      failureStatusCodes: [502, 503],
      everyHours: 3,
      minutes: [15, 25],
    },
    sessionsPerMinute: 6,
    // Most shoppers browse without signing in
    signedInRate: 0.35,
    environments: [
      { name: PRODUCTION_ENVIRONMENT, weight: 70, exceptions: PRODUCTION_EXCEPTIONS },
      {
        name: STAGING_ENVIRONMENT,
        weight: 25,
        exceptions: [stagingExperiment('product-recommendations-v2')],
      },
      {
        name: PREVIEW_ENVIRONMENT,
        weight: 5,
        withoutExceptions: true,
        withoutResourceTimings: true,
      },
    ],
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
        { path: '/assets/js/vendors-react.9d4e7b.js', initiatorType: 'script', sizeBytes: 140_000 },
        { path: '/assets/fonts/inter-var.4c1f9e.woff2', initiatorType: 'css', sizeBytes: 48_000 },
        {
          path: 'https://www.googletagmanager.com/gtag/js?id=G-STORE4821',
          initiatorType: 'script',
          sizeBytes: 140_000,
          probability: 0.9,
        },
        // Chunks of the lazy-loaded features, which only some page loads need
        {
          path: '/assets/js/chunk-recommendations.7e02bd.js',
          initiatorType: 'script',
          sizeBytes: 52_000,
          probability: 0.6,
        },
        {
          path: '/assets/js/chunk-cart-drawer.2b97a0.js',
          initiatorType: 'script',
          sizeBytes: 31_000,
          probability: 0.5,
        },
        {
          path: '/assets/js/chunk-search-suggest.c58f13.js',
          initiatorType: 'script',
          sizeBytes: 24_000,
          probability: 0.4,
        },
        {
          path: '/assets/js/chunk-zoom.e6d3c8.js',
          initiatorType: 'script',
          sizeBytes: 18_000,
          probability: 0.25,
        },
        {
          path: 'https://static.example-reviews.com/widget/v2/loader.js',
          initiatorType: 'script',
          sizeBytes: 62_000,
          probability: 0.35,
        },
      ],
      pages: [
        {
          path: '/',
          weight: 30,
          resources: [
            { path: '/assets/img/hero-autumn.webp', initiatorType: 'img', sizeBytes: 180_000 },
            {
              // A long URL, to see how the table shortens it
              path: `${STORE_CDN_ORIGIN}/store/catalog/footwear/trail-running/hero/autumn-2026-collection/trail-running-shoes-hero-2400x1600-v3.webp?w=1200&h=800&q=80&fit=crop&auto=format&fm=webp&cs=srgb`,
              initiatorType: 'img',
              sizeBytes: 210_000,
              probability: 0.8,
            },
            {
              path: '/assets/img/promo-strip.4a1b73.webp',
              initiatorType: 'img',
              sizeBytes: 64_000,
              probability: 0.6,
            },
            {
              path: '/assets/img/categories/trail.webp',
              initiatorType: 'img',
              sizeBytes: 38_000,
              probability: 0.7,
            },
            {
              path: '/assets/img/categories/road.webp',
              initiatorType: 'img',
              sizeBytes: 36_000,
              probability: 0.7,
            },
          ],
          requests: [
            {
              method: 'GET',
              url: `${STOREFRONT_ORIGIN}/api/recommendations`,
              // Cold caches make one request in ten ten times slower
              slowTail: { rate: 0.1, factor: 10 },
            },
          ],
          clickTargets: [
            { tagName: 'A', cssSelector: 'section.hero > a.cta', weight: 3 },
            { tagName: 'A', cssSelector: 'nav.main-nav > a:nth-child(2)', weight: 3 },
            // The hero image looks like it leads somewhere, but only its button does
            { tagName: 'IMG', cssSelector: 'section.hero > img', weight: 1.5, deadClickRate: 0.15 },
            { tagName: 'INPUT', cssSelector: '#search' },
          ],
        },
        {
          path: '/products',
          weight: 22,
          resources: [
            {
              path: '/assets/img/products/thumbs-sheet.3c1d52.webp',
              initiatorType: 'img',
              sizeBytes: 95_000,
            },
            {
              path: '/assets/js/chunk-filters.5d0e86.js',
              initiatorType: 'script',
              sizeBytes: 29_000,
              probability: 0.7,
            },
          ],
          requests: [{ method: 'GET', url: `${STOREFRONT_ORIGIN}/api/products?page=1` }],
        },
        {
          path: '/products/trail-running-shoes',
          weight: 22,
          resources: [
            { path: '/assets/img/products/trail-1.webp', initiatorType: 'img', sizeBytes: 120_000 },
            {
              path: '/assets/img/products/trail-2.webp',
              initiatorType: 'img',
              sizeBytes: 118_000,
              probability: 0.6,
            },
            {
              path: '/assets/img/products/trail-3.webp',
              initiatorType: 'img',
              sizeBytes: 126_000,
              probability: 0.4,
            },
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
              weight: 5,
              exceptions: [PRIVATE_BROWSING_STORAGE_ERROR],
            },
            // EDOT Browser only reports dead clicks on clickable-looking elements: the pointer
            // gallery, a reviews link without a handler and a sold-out size
            {
              tagName: 'IMG',
              cssSelector: 'div.gallery > img:nth-child(2)',
              weight: 1.5,
              deadClickRate: 0.35,
            },
            {
              tagName: 'A',
              cssSelector: 'div.product-info > a.reviews-count',
              weight: 0.75,
              deadClickRate: 0.5,
            },
            {
              tagName: 'BUTTON',
              cssSelector: 'div.size-picker > button:nth-child(5)',
              weight: 0.5,
              deadClickRate: 0.9,
            },
            { tagName: 'A', cssSelector: 'nav.breadcrumbs > a:nth-child(2)', weight: 2 },
          ],
        },
        {
          // Search is slow on a cold index, and shoppers hammer the button while they wait
          path: '/search?q=trail+shoes',
          weight: 12,
          requests: [{ method: 'GET', url: `${STOREFRONT_ORIGIN}/api/search/suggest?q=trail` }],
          clickTargets: [
            {
              tagName: 'BUTTON',
              cssSelector: 'form.search > button:nth-child(2)',
              otelAttributes: { action: 'search' },
              weight: 4,
              request: {
                method: 'GET',
                url: `${STOREFRONT_ORIGIN}/api/search?q=trail+shoes`,
                latencyFactor: 4,
                slowTail: { rate: 0.6, factor: 6 },
              },
            },
            { tagName: 'INPUT', cssSelector: '#search', weight: 2 },
            { tagName: 'DIV', cssSelector: 'ul.results > li:nth-child(1) > div.card', weight: 3 },
          ],
          // Suggestions still in flight are aborted as the shopper types on
          exceptions: [
            { message: 'signal is aborted without reason', engines: ['chromium'] as const },
            { message: 'The operation was aborted. ', engines: ['firefox'] as const },
            { message: 'Fetch is aborted', engines: ['webkit'] as const },
          ].map(({ message, engines }) => ({
            type: 'AbortError',
            message,
            engines,
            rate: 0.1,
            stacks: [
              [
                { functionName: 'SearchSuggest.fetchSuggestions' },
                { functionName: 'async SearchSuggest.onInput' },
              ],
            ],
          })),
        },
        {
          path: '/cart',
          weight: 10,
          requests: [{ method: 'GET', url: `${STOREFRONT_ORIGIN}/api/cart` }],
          clickTargets: [
            {
              tagName: 'A',
              cssSelector: 'a.checkout-button',
              weight: 3,
            },
            {
              tagName: 'BUTTON',
              cssSelector: '#apply-promo',
              request: {
                method: 'POST',
                url: `${STOREFRONT_ORIGIN}/api/cart/promo`,
                failureRate: 0.3,
                failureStatusCodes: [422],
              },
            },
          ],
        },
        {
          path: '/account/orders',
          weight: 4,
          requests: [
            {
              // One URL per order, and orders that expired can't be found any more
              method: 'GET',
              url: `${STOREFRONT_ORIGIN}/api/orders/{id}`,
              ids: ['ord-10482', 'ord-10477', 'ord-10463', 'ord-10451'],
              failureRate: 0.12,
              failureStatusCodes: [404],
            },
          ],
        },
      ],
    },
  },
  {
    serviceName: 'checkout-web',
    versions: [
      { version: '2.3.1', weight: 70 },
      {
        version: '2.4.0',
        weight: 30,
        // The new address form drops the postal code of saved addresses from before it
        clickExceptions: {
          '#continue-to-payment': edotBrowser.readPropertyErrors(
            { variable: 'address', property: 'postalCode' },
            {
              rate: 0.35,
              persistent: true,
              stacks: [
                [
                  { functionName: 'validateShipping' },
                  { functionName: 'ShippingForm.handleSubmit' },
                  { functionName: 'HTMLFormElement.onsubmit' },
                ],
              ],
            }
          ),
        },
      },
    ],
    health: 'erroring',
    incident: {
      url: `${CHECKOUT_ORIGIN}/api/payment`,
      failureRate: 0.85,
      failureStatusCodes: [503],
      everyHours: 3,
      minutes: [10, 20],
    },
    sessionsPerMinute: 4,
    // Guest checkout aside, buyers sign in
    signedInRate: 0.8,
    environments: [
      { name: PRODUCTION_ENVIRONMENT, weight: 70, exceptions: PRODUCTION_EXCEPTIONS },
      {
        name: STAGING_ENVIRONMENT,
        weight: 20,
        exceptions: [stagingExperiment('new-payment-flow')],
      },
      {
        name: PREVIEW_ENVIRONMENT,
        weight: 10,
        withoutExceptions: true,
        withoutResourceTimings: true,
      },
    ],
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
        {
          path: '/static/css/checkout.5a2e91.css',
          initiatorType: 'link',
          sizeBytes: 38_000,
          renderBlocking: true,
        },
        {
          path: '/static/js/vendor.checkout.b83d4f.js',
          initiatorType: 'script',
          sizeBytes: 180_000,
        },
        {
          path: '/static/media/lato-regular.7f3e1a.woff2',
          initiatorType: 'css',
          sizeBytes: 24_000,
        },
        {
          path: '/static/media/lato-bold.1c9a42.woff2',
          initiatorType: 'css',
          sizeBytes: 25_000,
          probability: 0.8,
        },
        {
          path: 'https://www.example-fraud.com/sdk/device-fingerprint.min.js',
          initiatorType: 'script',
          sizeBytes: 44_000,
          probability: 0.9,
        },
        {
          path: '/static/media/payment-icons.2c8b0d.svg',
          initiatorType: 'img',
          sizeBytes: 12_000,
        },
      ],
      pages: [
        {
          path: '/checkout/shipping',
          resources: [
            {
              path: '/static/js/chunk-address-autocomplete.4ee6a7.js',
              initiatorType: 'script',
              sizeBytes: 36_000,
            },
            {
              path: 'https://maps.example-geo.com/maps/api/js?libraries=places&callback=initAutocomplete&language=en-US&region=US&loading=async&v=weekly',
              initiatorType: 'script',
              sizeBytes: 180_000,
              probability: 0.7,
            },
          ],
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
              weight: 3,
              // It moves on to the payment step
              deadClickRate: 0,
            },
            { tagName: 'INPUT', cssSelector: '#address-line-1', weight: 2 },
          ],
        },
        {
          path: '/checkout/payment',
          resources: [
            {
              path: '/static/js/chunk-payment-form.91d0ca.js',
              initiatorType: 'script',
              sizeBytes: 58_000,
            },
            {
              path: 'https://js.example-payments.com/v3/elements-frame.html',
              initiatorType: 'other',
              sizeBytes: 22_000,
              probability: 0.85,
            },
          ],
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
              weight: 4,
              exceptions: [
                {
                  type: 'PaymentTokenizationError',
                  message: 'Card element is not mounted',
                  rate: 0.05,
                  stacks: [
                    [
                      { functionName: 'PaymentForm.tokenize' },
                      { functionName: 'async PaymentForm.handleSubmit' },
                    ],
                  ],
                },
              ],
            },
            {
              tagName: 'IMG',
              cssSelector: 'div.accepted-cards > img:nth-child(1)',
              deadClickRate: 0.4,
            },
          ],
        },
        {
          path: '/checkout/confirmation',
          resources: [
            {
              path: '/static/js/chunk-order-summary.6a1f3d.js',
              initiatorType: 'script',
              sizeBytes: 27_000,
            },
            {
              path: '/static/media/confirmation-check.8e41b7.svg',
              initiatorType: 'img',
              sizeBytes: 3_000,
            },
          ],
          requests: [{ method: 'GET', url: `${CHECKOUT_ORIGIN}/api/orders/latest` }],
        },
      ],
      exceptions: [
        {
          type: 'TypeError',
          message: "Cannot read properties of undefined (reading 'paymentMethod')",
          weight: 5,
          stacks: [
            [
              { functionName: 'PaymentForm.getPaymentMethod' },
              { functionName: 'PaymentForm.handleSubmit' },
              { functionName: 'HTMLFormElement.onsubmit' },
            ],
            [
              { functionName: 'validatePayment' },
              { functionName: 'PaymentForm.handleSubmit' },
              { functionName: 'HTMLFormElement.onsubmit' },
            ],
          ],
        },
        {
          type: 'TypeError',
          message: "Failed to execute 'postMessage' on 'Window'",
          weight: 3,
          stacks: [
            [
              {
                functionName: 'PaymentFrame.sendToken',
                file: 'https://js.example-payments.com/v3/',
                column: 20412,
              },
              {
                functionName: 'PaymentFrame.onMessage',
                file: 'https://js.example-payments.com/v3/',
              },
              { functionName: 'PaymentForm.tokenize' },
            ],
          ],
        },
        {
          type: 'SyntaxError',
          message: `Unexpected token '<', "<!DOCTYPE "... is not valid JSON`,
          weight: 3,
          stacks: [[{ functionName: 'JSON.parse' }, { functionName: 'fetchJson' }]],
        },
        {
          type: 'RangeError',
          message: 'Invalid time value',
          weight: 2,
          stacks: [[{ functionName: 'formatDeliveryDate' }, { functionName: 'OrderSummary' }]],
        },
      ],
    },
  },
  {
    serviceName: 'media-portal-web',
    versions: [{ version: '7.0.4', weight: 1 }],
    health: 'slow',
    sessionsPerMinute: 4,
    // Subscribers only
    signedInRate: 0.2,
    environments: [
      { name: PRODUCTION_ENVIRONMENT, weight: 85, exceptions: PRODUCTION_EXCEPTIONS },
      {
        name: PREVIEW_ENVIRONMENT,
        weight: 15,
        withoutExceptions: true,
        withoutResourceTimings: true,
      },
    ],
    site: {
      origin: MEDIA_ORIGIN,
      resources: [
        { path: '/static/js/article.7be41a.js', initiatorType: 'script', sizeBytes: 210_000 },
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
        {
          path: '/static/fonts/merriweather-700.9a1c3e.woff2',
          initiatorType: 'css',
          sizeBytes: 62_000,
        },
        {
          path: '/static/fonts/merriweather-400.4e2b81.woff2',
          initiatorType: 'css',
          sizeBytes: 58_000,
        },
        {
          path: 'https://ads.example-adnetwork.com/tag/loader.js',
          initiatorType: 'script',
          sizeBytes: 120_000,
          durationFactor: 2,
          probability: 0.9,
        },
        {
          path: 'https://ads.example-adnetwork.com/pixel/impression.gif?slot=top-banner&cb=84721&pub=example-news&consent=1',
          initiatorType: 'img',
          sizeBytes: 1_000,
          probability: 0.8,
        },
        {
          path: ANALYTICS_SCRIPT,
          initiatorType: 'script',
          sizeBytes: 38_000,
          probability: 0.9,
        },
        {
          path: '/static/js/chunk-comments.3d8a52.js',
          initiatorType: 'script',
          sizeBytes: 44_000,
          probability: 0.5,
        },
        {
          path: '/static/js/chunk-share-bar.b17e04.js',
          initiatorType: 'script',
          sizeBytes: 16_000,
          probability: 0.6,
        },
        {
          path: '/static/js/chunk-newsletter-modal.c9f4e1.js',
          initiatorType: 'script',
          sizeBytes: 21_000,
          probability: 0.35,
        },
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
            {
              path: '/images/front/story-2.jpg',
              initiatorType: 'img',
              sizeBytes: 1_200_000,
              durationFactor: 3,
              probability: 0.9,
            },
            {
              path: '/images/front/story-3.jpg',
              initiatorType: 'img',
              sizeBytes: 1_100_000,
              durationFactor: 3,
              probability: 0.8,
            },
            {
              path: '/images/front/story-4.jpg',
              initiatorType: 'img',
              sizeBytes: 980_000,
              durationFactor: 3,
              probability: 0.7,
            },
          ],
          requests: [
            { method: 'GET', url: `${MEDIA_ORIGIN}/api/headlines` },
            {
              // New readers have no saved preferences, which the API answers with a 404
              method: 'GET',
              url: `${MEDIA_ORIGIN}/api/user/preferences`,
              failureRate: 0.2,
              failureStatusCodes: [404],
            },
          ],
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
            {
              path: '/images/articles/bike-lanes-map.jpg',
              initiatorType: 'img',
              sizeBytes: 640_000,
              durationFactor: 2,
              probability: 0.6,
            },
          ],
          requests: [
            {
              method: 'GET',
              url: `${MEDIA_ORIGIN}/api/comments?article=bike-lanes`,
              latencyFactor: 2,
            },
            {
              method: 'GET',
              url: `${MEDIA_ORIGIN}/api/user/preferences`,
              failureRate: 0.2,
              failureStatusCodes: [404],
            },
          ],
          clickTargets: [
            {
              tagName: 'BUTTON',
              cssSelector: 'section.comments > button.load-more',
              weight: 2,
              request: {
                method: 'GET',
                url: `${MEDIA_ORIGIN}/api/comments?article=bike-lanes&page=2`,
                latencyFactor: 1.5,
              },
            },
            { tagName: 'IMG', cssSelector: 'figure.lead > img', deadClickRate: 0.3 },
            { tagName: 'A', cssSelector: 'aside.related > a:nth-child(1)', weight: 2 },
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
            {
              path: 'https://video-cdn.example-news.com/hls/weekly-roundup/master.m3u8',
              initiatorType: 'other',
              sizeBytes: 2_000,
              probability: 0.9,
            },
          ],
          clickTargets: [
            {
              tagName: 'BUTTON',
              cssSelector: 'button.vjs-play-control',
              weight: 3,
            },
            // The poster shows a play icon, but the player only listens to its button
            { tagName: 'DIV', cssSelector: 'div.vjs-poster', deadClickRate: 0.3 },
          ],
        },
      ],
      exceptions: [
        {
          type: 'AbortError',
          message: 'The play() request was interrupted by a call to pause().',
          weight: 3,
          stacks: [[{ functionName: 'VideoPlayer.play', file: '/static/js/player.ef01c9.js' }]],
        },
        {
          type: 'TypeError',
          message: "Cannot read properties of null (reading 'offsetHeight')",
          weight: 3,
          stacks: [[{ functionName: 'StickyAd.measure' }, { functionName: 'StickyAd.onScroll' }]],
        },
      ],
    },
  },
  {
    serviceName: 'support-center-web',
    versions: [{ version: '0.9.3', weight: 1 }],
    health: 'critical',
    sessionsPerMinute: 2,
    // A B2B help desk, used by the customers' agents
    signedInRate: 0.75,
    accounts: SAAS_ACCOUNTS,
    environments: [
      { name: PRODUCTION_ENVIRONMENT, weight: 60, exceptions: PRODUCTION_EXCEPTIONS },
      {
        name: STAGING_ENVIRONMENT,
        weight: 40,
        exceptions: [stagingExperiment('ticket-editor-v2')],
      },
    ],
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
        { path: '/bundle/vendor.js', initiatorType: 'script', sizeBytes: 1_200_000 },
        { path: '/bundle/icons.svg', initiatorType: 'img', sizeBytes: 54_000 },
        {
          path: 'https://cdn.example-saas.com/fonts/ibm-plex-sans-var.woff2',
          initiatorType: 'css',
          sizeBytes: 96_000,
        },
        {
          path: 'https://widget.example-chat.com/v4/launcher.js',
          initiatorType: 'script',
          sizeBytes: 210_000,
          durationFactor: 1.5,
          probability: 0.9,
        },
        { path: ANALYTICS_SCRIPT, initiatorType: 'script', sizeBytes: 38_000, probability: 0.8 },
        {
          path: '/bundle/chunk-editor.6d3b91.js',
          initiatorType: 'script',
          sizeBytes: 380_000,
          probability: 0.6,
        },
        {
          path: '/bundle/chunk-attachments.f3a1c7.js',
          initiatorType: 'script',
          sizeBytes: 120_000,
          probability: 0.4,
        },
        {
          path: '/bundle/chunk-kb-search.8c0e25.js',
          initiatorType: 'script',
          sizeBytes: 74_000,
          probability: 0.5,
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
              weight: 3,
              exceptions: [
                {
                  type: 'AttachmentUploadError',
                  message: 'Attachment upload is still in progress',
                  rate: 0.08,
                  stacks: [
                    [
                      { functionName: 'TicketForm.assertUploadsDone' },
                      { functionName: 'TicketForm.handleSubmit' },
                    ],
                  ],
                },
              ],
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
        {
          type: 'TypeError',
          message: "Cannot read properties of null (reading 'focus')",
          weight: 3,
          stacks: [
            [
              { functionName: 'TicketEditor.focusBody' },
              { functionName: 'TicketEditor.componentDidMount' },
            ],
            [{ functionName: 'ReplyBox.focus' }, { functionName: 'ReplyBox.componentDidUpdate' }],
          ],
        },
        {
          type: 'RangeError',
          message: 'Maximum call stack size exceeded',
          weight: 1,
          // Unbounded recursion: the same frame again and again
          stacks: [
            [
              ...Array.from({ length: 6 }, () => ({ functionName: 'serializeNode' })),
              { functionName: 'TicketThread.render' },
            ],
          ],
        },
      ],
    },
  },
  {
    serviceName: 'docs-web',
    versions: [{ version: '1.0.0', weight: 1 }],
    health: 'healthy',
    sessionsPerMinute: 1,
    // Public docs, read signed in by a few of the SaaS customers
    signedInRate: 0.1,
    accounts: SAAS_ACCOUNTS,
    withoutEnvironment: true,
    // Some deployments of the docs report no environment, which is how it shows without any
    environments: [{ name: PRODUCTION_ENVIRONMENT, weight: 70 }, { weight: 30 }],
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
        {
          path: '/_next/static/chunks/framework-3c91d7.js',
          initiatorType: 'script',
          sizeBytes: 140_000,
        },
        {
          path: '/_next/static/chunks/pages/_app-5e2a1b.js',
          initiatorType: 'script',
          sizeBytes: 62_000,
        },
        {
          path: '/_next/static/chunks/search-modal-7b2140.js',
          initiatorType: 'script',
          sizeBytes: 33_000,
          probability: 0.5,
        },
        {
          path: '/_next/static/media/source-code-pro.9f3a6c.woff2',
          initiatorType: 'css',
          sizeBytes: 41_000,
        },
        { path: ANALYTICS_SCRIPT, initiatorType: 'script', sizeBytes: 38_000, probability: 0.8 },
      ],
      pages: [
        { path: '/' },
        {
          path: '/guides/getting-started',
          clickTargets: [
            {
              tagName: 'BUTTON',
              cssSelector: 'div.code-block > button.copy',
              weight: 2,
              deadClickRate: 0,
              // Safari only lets a page write to the clipboard right in the click handler
              exceptions: [
                {
                  type: 'NotAllowedError',
                  message:
                    'The request is not allowed by the user agent or the platform in the current context, possibly because the user denied permission.',
                  engines: ['webkit'],
                  rate: 0.6,
                  stacks: [
                    [
                      { functionName: 'copyToClipboard' },
                      { functionName: 'async CodeBlock.onCopy' },
                    ],
                  ],
                },
              ],
            },
            { tagName: 'A', cssSelector: 'nav.sidebar > a:nth-child(3)', weight: 3 },
          ],
        },
        { path: '/api-reference/webhooks' },
        {
          path: '/search?q=webhooks',
          requests: [{ method: 'GET', url: `${DOCS_ORIGIN}/api/search?q=webhooks` }],
        },
      ],
    },
  },
];

type BooleanOptKey =
  | 'withSessionId'
  | 'includeRawAttribution'
  | 'environments'
  | 'edgeCases'
  | 'ongoingSessions'
  | 'frustration';

/** Parses a boolean scenario option given as a boolean or a `true`/`false` string. */
export const parseBooleanOption = (key: string, value: unknown, defaultValue: boolean): boolean => {
  if (value === undefined) {
    return defaultValue;
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

const parseBooleanOpt = (opts: Record<string, unknown> | undefined, key: BooleanOptKey): boolean =>
  parseBooleanOption(key, opts?.[key], DEFAULT_SCENARIO_OPTS[key]);

/** Parses a rate scenario option, a number from 0 to 1 given as a number or a numeric string. */
export const parseRate = (key: string, value: unknown, defaultValue: number): number => {
  if (value === undefined) {
    return defaultValue;
  }
  const rate = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  if (typeof rate !== 'number' || !Number.isFinite(rate) || rate < 0 || rate > 1) {
    throw new Error(`${key} must be a number from 0 to 1`);
  }
  return rate;
};

/** Parses the `replaySize` scenario option. */
export const parseReplaySize = (value: unknown, defaultValue: ReplaySize): ReplaySize => {
  if (value === undefined) {
    return defaultValue;
  }
  const size = edotBrowser.replaySizes.find((replaySize) => replaySize === value);
  if (size === undefined) {
    throw new Error(`replaySize must be one of ${edotBrowser.replaySizes.join(', ')}`);
  }
  return size;
};

const HOUR_MS = 60 * 60_000;

// `maxDuration` bounds a session, from its first visit to the end of its last one, with room to
// spare: an expired session's tab idles for up to 1.5 hours before the visit that ends it, and the
// longest sessions seen run about 1.6, 2.3 and 3.6 hours. With `ongoingSessions`, the events of a
// session after it are left out.
const SESSION_LENGTHS = {
  typical: { minPageViews: 1, maxPageViews: 5, dwell: undefined, maxDuration: 2 * HOUR_MS },
  long: {
    minPageViews: 15,
    maxPageViews: 40,
    dwell: { median: 40_000, sigma: 0.8 },
    maxDuration: 3 * HOUR_MS,
  },
  marathon: {
    minPageViews: 60,
    maxPageViews: 120,
    dwell: { median: 40_000, sigma: 0.8 },
    maxDuration: 5 * HOUR_MS,
  },
} as const;

export type SessionLength = keyof typeof SESSION_LENGTHS;

const SESSION_LENGTH_NAMES = Object.keys(SESSION_LENGTHS) as SessionLength[];

/** Parses the `sessionLength` scenario option. */
export const parseSessionLength = (value: unknown, defaultValue: SessionLength): SessionLength => {
  if (value === undefined) {
    return defaultValue;
  }
  const length = SESSION_LENGTH_NAMES.find((name) => name === value);
  if (length === undefined) {
    throw new Error(`sessionLength must be one of ${SESSION_LENGTH_NAMES.join(', ')}`);
  }
  return length;
};

/** Parses the `scale` scenario option, a positive number. */
export const parseScale = (value: unknown, defaultValue: number): number => {
  if (value === undefined) {
    return defaultValue;
  }
  const scale = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  if (typeof scale !== 'number' || !Number.isFinite(scale) || scale <= 0) {
    throw new Error('scale must be a positive number');
  }
  return scale;
};

/** Parses the `seed` scenario option, a non-empty string or a finite number. */
export const parseSeed = (value: unknown, defaultValue: string): string => {
  if (value === undefined) {
    return defaultValue;
  }
  if ((typeof value === 'string' && value.trim() !== '') || Number.isFinite(value)) {
    return String(value);
  }
  throw new Error('seed must be a non-empty string or a finite number');
};

/** The default seed: the run's `from` in milliseconds, which every worker and live batch share. */
export const getDefaultSeed = (from: number): string => String(from);

/** Appended to the logged options: the default seed repeats the data of runs with the same `from`. */
export const SEED_LOG_HINT =
  'pass --scenarioOpts seed=<value> to vary the data for the same --from';

/**
 * Parses `--scenarioOpts` for the digital experience scenarios, rejecting unknown keys and values
 * and defaulting the seed to the run's `from`.
 */
export const parseDigitalExperienceScenarioOpts = (
  opts: Record<string, unknown> | undefined,
  from: number
): DigitalExperienceScenarioOpts => {
  const unknownKeys = Object.keys(opts ?? {}).filter(
    (key) => key !== 'seed' && !Object.hasOwn(DEFAULT_SCENARIO_OPTS, key)
  );
  if (unknownKeys.length) {
    throw new Error(`Unknown scenarioOpts: ${unknownKeys.join(', ')}`);
  }

  return {
    withSessionId: parseBooleanOpt(opts, 'withSessionId'),
    includeRawAttribution: parseBooleanOpt(opts, 'includeRawAttribution'),
    environments: parseBooleanOpt(opts, 'environments'),
    edgeCases: parseBooleanOpt(opts, 'edgeCases'),
    replayRate: parseRate('replayRate', opts?.replayRate, DEFAULT_SCENARIO_OPTS.replayRate),
    errorReplayRate: parseRate(
      'errorReplayRate',
      opts?.errorReplayRate,
      DEFAULT_SCENARIO_OPTS.errorReplayRate
    ),
    replaySize: parseReplaySize(opts?.replaySize, DEFAULT_SCENARIO_OPTS.replaySize),
    sessionLength: parseSessionLength(opts?.sessionLength, DEFAULT_SCENARIO_OPTS.sessionLength),
    ongoingSessions: parseBooleanOpt(opts, 'ongoingSessions'),
    scale: parseScale(opts?.scale, DEFAULT_SCENARIO_OPTS.scale),
    seed: parseSeed(opts?.seed, getDefaultSeed(from)),
    signedInRate:
      opts?.signedInRate === undefined
        ? undefined
        : parseRate('signedInRate', opts.signedInRate, 0),
    frustration: parseBooleanOpt(opts, 'frustration'),
  };
};

const MS_PER_MINUTE = 60_000;

/** When the session `index` of a rate of `perMinute` sessions starts, by absolute time. */
export const sessionTimeOf = (index: number, perMinute: number): number =>
  Math.ceil(((index + 1) * MS_PER_MINUTE) / perMinute) - 1;

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
export const randomUuid = (random: () => number): string =>
  generateUuid({ random: Uint8Array.from({ length: 16 }, () => Math.floor(random() * 256)) });

/** The `@timestamp` of an event's first document. */
export const getTimestamp = (event: Serializable<Fields>): number =>
  Number(event.serialize()[0]['@timestamp']);

/** The `@timestamp` of the earliest of `events`. */
const getStart = (events: Array<Serializable<Fields>>): number =>
  events.reduce((start, event) => Math.min(start, getTimestamp(event)), Infinity);

interface OngoingSession<TFields extends Fields> {
  /** The time the session is generated for, when it starts. */
  start: number;
  /** Its events by release time, and the next one to write. */
  events: Array<{ time: number; event: Serializable<TFields> }>;
  next: number;
}

interface OngoingSessions<TFields extends Fields> {
  /** The end of the last window written. The window that starts there carries on from here. */
  end: number;
  /** The index of the next session to start. */
  nextIndex: number;
  sessions: Array<OngoingSession<TFields>>;
}

/**
 * The sessions in progress by run and app. Live mode calls the scenario again for every batch of a
 * second or so, so a store lives for the whole process and keeps them between batches, instead of
 * simulating them again for every batch.
 */
export type OngoingSessionStore<TFields extends Fields> = Map<string, OngoingSessions<TFields>>;

const ongoingBrowserSessions: OngoingSessionStore<EdotBrowserDocument> = new Map();

/**
 * Like {@link generatePerMinute}, except that sessions start at their time and run on from there:
 * every one-second window has the events that the sessions in progress have in it, so live mode
 * writes a session as it goes, never ahead of the window. Sessions that started up to `maxDuration`
 * before a window are in progress, and their events after that are left out. A window that doesn't
 * follow the last one written for `key` starts over: `create` is then called again for the sessions
 * started within `maxDuration`, with `after` set to the window's start, and may return nothing for
 * a session that ended before. Every window has the same events either way. An event is written in
 * the window of its `releaseTime`, by default its `@timestamp`.
 */
export const generateOngoingPerMinute = <TFields extends Fields>(
  range: Timerange,
  perMinute: number,
  {
    store,
    key,
    maxDuration,
    create,
    releaseTime = getTimestamp,
  }: {
    store: OngoingSessionStore<TFields>;
    key: string;
    maxDuration: number;
    /** When the event is sent, e.g. a crash reported on the next launch, if not its `@timestamp`. */
    releaseTime?: (event: Serializable<TFields>) => number;
    create: (session: {
      time: number;
      index: number;
      after: number;
    }) => Array<Serializable<TFields>>;
  }
): SynthtraceGenerator<TFields> => {
  const to = range.to.getTime();
  // The same numbering and times as generatePerMinute, by absolute time
  const indexAt = (time: number) => Math.floor((perMinute * time) / MS_PER_MINUTE);

  return range.interval('1s').generator<TFields>((windowStart, _index, { stepMilliseconds }) => {
    const windowEnd = Math.min(windowStart + stepMilliseconds, to);
    const previous = store.get(key);
    const state: OngoingSessions<TFields> =
      previous?.end === windowStart
        ? previous
        : {
            end: windowStart,
            // One more than needed, in case rounding puts a session's time on the other side
            nextIndex: Math.max(indexAt(windowStart - maxDuration) - 1, 0),
            sessions: [],
          };

    while (state.nextIndex < indexAt(windowEnd)) {
      const index = state.nextIndex++;
      const start = sessionTimeOf(index, perMinute);
      const events = create({ time: start, index, after: windowStart })
        .map((event) => ({ time: releaseTime(event), event }))
        .sort((a, b) => a.time - b.time);
      state.sessions.push({ start, events, next: 0 });
    }

    const written: Array<Serializable<TFields>> = [];
    for (const session of state.sessions) {
      const { start, events } = session;
      while (session.next < events.length && events[session.next].time < windowEnd) {
        const { time, event } = events[session.next++];
        if (time >= windowStart && time >= start && time < start + maxDuration) {
          written.push(event);
        }
      }
    }

    state.end = windowEnd;
    state.sessions = state.sessions.filter(
      ({ start, events, next }) => next < events.length && start + maxDuration > windowEnd
    );
    store.set(key, state);
    return written;
  });
};

// EDOT Browser 0.4.0 is the first release that writes session data, 0.3.0 the last one without
const DISTRO_VERSION_WITH_SESSIONS = '0.4.0';
const DISTRO_VERSION_WITHOUT_SESSIONS = '0.3.0';
const MINUTE_MS = 60_000;
// EDOT Browser ends a session after 30 minutes without user activity
const SESSION_IDLE_TIMEOUT_MS = 30 * MINUTE_MS;
const RESUMED_SESSION_RATE = 0.15;
const EXPIRED_SESSION_RATE = 0.15;
const FOLLOW_UP_SESSION_RATE = 0.1;
const SAME_TAB_RATE = 0.5;
const EARLIER_VISIT_PAGE_VIEWS = 2;
const IDLE_REQUEST_COUNT = 3;
// A session and its earlier visits, up to an hour and a half before, take less than this many
// times the maximum duration of a session, before the run or after it in live mode
const OUTAGE_MARGIN_SESSIONS = 3;
// Share of the recorded sessions that run with `replay.quality.packEvents`
const PACKED_SESSION_RATE = 0.15;
// Shares of the recorded sessions that get each replay edge case, with `edgeCases`
const MISSING_CHUNK_SESSION_RATE = 0.15;
const LATE_REPLAY_SESSION_RATE = 0.15;
// An app has this many users per session a minute: at about 6 sessions a day each, users come back
const USERS_PER_SESSION_PER_MINUTE = 240;
const MIN_USERS = 10;
// Share of the signed-in sessions that start anonymous and sign in after their first page load
const SIGN_IN_DURING_SESSION_RATE = 0.25;
// Shares of the users whose app passes their email and their name to `setUser()`
const USER_EMAIL_RATE = 0.7;
const USER_FULL_NAME_RATE = 0.5;
const FIRST_NAMES = ['ada', 'alan', 'grace', 'linus', 'margaret', 'ken', 'barbara', 'dennis'];
const LAST_NAMES = ['lovelace', 'turing', 'hopper', 'torvalds', 'hamilton', 'thompson', 'liskov'];

const capitalize = (name: string) => `${name[0].toUpperCase()}${name.slice(1)}`;
const pickFrom = <T>(random: () => number, values: readonly T[]): T =>
  values[Math.floor(random() * values.length)];

/**
 * The user numbered `number` of an app, the same in every session and environment of the app. Only
 * `id` is required by `setUser()`, so some users have no email or name.
 */
const appUser = (
  {
    seed,
    serviceName,
    accounts,
  }: { seed: string; serviceName: string; accounts?: readonly string[] },
  number: number
): EdotBrowserUser => {
  const random = createSeededRandom(`${seed}:${serviceName}:user:${number}`);
  const [first, last] = [pickFrom(random, FIRST_NAMES), pickFrom(random, LAST_NAMES)];
  const [emailDraw, nameDraw] = [random(), random()];
  return {
    id: `usr_${Math.floor(random() * 0x100000000)
      .toString(16)
      .padStart(8, '0')}`,
    ...(emailDraw < USER_EMAIL_RATE ? { email: `${first}.${last}.${number}@example.com` } : {}),
    ...(nameDraw < USER_FULL_NAME_RATE
      ? { fullName: `${capitalize(first)} ${capitalize(last)}` }
      : {}),
    ...(accounts ? { account: pickFrom(random, accounts) } : {}),
  };
};

/**
 * How a session records, decided once per session as EDOT Browser does: a value from 0 to 1 taken
 * from the last 8 hex digits of the session ID is under `replayRate` for sessions recorded from the
 * start, and in the next `errorReplayRate` share of what is left for those recorded from their error.
 */
const getReplayTrigger = (
  sessionId: string,
  replayRate: number,
  errorReplayRate: number
): 'sampled' | 'error' | undefined => {
  const value = Number.parseInt(sessionId.slice(-8), 16) / 0x100000000;
  if (value < replayRate) {
    return 'sampled';
  }
  return replayRate < 1 && (value - replayRate) / (1 - replayRate) < errorReplayRate
    ? 'error'
    : undefined;
};

const pickByWeight = <T extends { weight: number }>(
  random: () => number,
  items: readonly T[]
): T => {
  let threshold = random() * items.reduce((sum, { weight }) => sum + weight, 0);
  for (const item of items) {
    threshold -= item.weight;
    if (threshold < 0) {
      return item;
    }
  }
  return items[items.length - 1];
};

const DAY_MS = 24 * HOUR_MS;
// Traffic follows the day, from 35% of its peak at 04:00 UTC up to the peak at 16:00, and drifts
// down by up to a quarter from one 10 minutes to the next. Sessions are generated at the peak rate
// and thinned to that share, which keeps the average rate of the day as the app's.
const TRAFFIC_TROUGH = 0.35;
const TRAFFIC_PEAK_HOUR = 16;
const TRAFFIC_DRIFT = 0.25;
const TRAFFIC_DRIFT_MS = 10 * MINUTE_MS;
const PEAK_TRAFFIC_FACTOR = 1 / (((1 + TRAFFIC_TROUGH) / 2) * (1 - TRAFFIC_DRIFT / 2));

/** The share of its peak traffic that an app has at `time`, the same in every run with the seed. */
export const trafficShareAt = (seed: string, serviceName: string, time: number): number => {
  const hour = (((time % DAY_MS) + DAY_MS) % DAY_MS) / HOUR_MS;
  const daily =
    TRAFFIC_TROUGH +
    (1 - TRAFFIC_TROUGH) * (0.5 + 0.5 * Math.cos((2 * Math.PI * (hour - TRAFFIC_PEAK_HOUR)) / 24));
  const driftRandom = createSeededRandom(
    `${seed}:${serviceName}:traffic:${Math.floor(time / TRAFFIC_DRIFT_MS)}`
  );
  return daily * (1 - TRAFFIC_DRIFT * driftRandom());
};

/** The incident of the period of `everyHours` that `time` falls in, from `start` to `end`. */
export const incidentWindowAt = (
  seed: string,
  serviceName: string,
  { everyHours, minutes: [minMinutes, maxMinutes] }: DigitalExperienceIncident,
  time: number
): { start: number; end: number } => {
  const period = everyHours * HOUR_MS;
  const periodStart = Math.floor(time / period) * period;
  const random = createSeededRandom(`${seed}:${serviceName}:incident:${periodStart}`);
  const duration = Math.round((minMinutes + random() * (maxMinutes - minMinutes)) * MINUTE_MS);
  const start = periodStart + Math.floor(random() * (period - duration));
  return { start, end: start + duration };
};

/** The incidents of every period of `everyHours` from `from` up to `to`, as outages. */
export const incidentOutagesBetween = (
  seed: string,
  serviceName: string,
  incident: DigitalExperienceIncident,
  from: number,
  to: number
): EdotBrowserOutage[] => {
  const period = incident.everyHours * HOUR_MS;
  const outages: EdotBrowserOutage[] = [];
  for (
    let periodStart = Math.floor(from / period) * period;
    periodStart < to;
    periodStart += period
  ) {
    outages.push({
      ...incidentWindowAt(seed, serviceName, incident, periodStart),
      failureRate: incident.failureRate,
      failureStatusCodes: incident.failureStatusCodes,
    });
  }
  return outages;
};

/**
 * The site as a version of the app runs it: with the exceptions that its clicks throw and the
 * outages of the endpoint of its incident, which fail the requests sent during them.
 */
const siteOfVersion = (
  site: EdotBrowserSite,
  { clickExceptions = {} }: DigitalExperienceVersion,
  incident?: { url: string; outages: readonly EdotBrowserOutage[] }
): EdotBrowserSite => {
  const duringIncident = (request: EdotBrowserRequest): EdotBrowserRequest =>
    incident && request.url === incident.url ? { ...request, outages: incident.outages } : request;
  const page = ({ requests, clickTargets, ...rest }: EdotBrowserPage): EdotBrowserPage => ({
    ...rest,
    ...(requests ? { requests: requests.map(duringIncident) } : {}),
    ...(clickTargets
      ? {
          clickTargets: clickTargets.map(({ request, exceptions = [], ...target }) => ({
            ...target,
            ...(request ? { request: duringIncident(request) } : {}),
            exceptions: [
              ...exceptions,
              ...((target.cssSelector && clickExceptions[target.cssSelector]) || []),
            ],
          })),
        }
      : {}),
  });
  return { ...site, pages: site.pages.map(page) };
};

/**
 * One generator per app, and environment of the app, in the catalogue, each producing EDOT Browser
 * sessions over `range`. Without the `environments` option, an app only has the scenario's
 * `environment`, or none for the apps without one, and all of its traffic.
 * Sessions end at the time of their rate tick, so live mode never writes into the future, or with
 * `ongoingSessions` start there and are written as they go, by {@link generateOngoingPerMinute}.
 * Sessions that started before the run's `from` are cut off there, like traffic at the edge of any
 * window.
 *
 * Most sessions are a single visit in a new tab. Some are a second visit to a session that is
 * still running, in the same tab or in another one. Others come back after the previous
 * session expired: the tab stayed open sending background requests with no session ID, and the
 * user's return starts a new session that points to the expired one. The earlier visits of these
 * sessions precede the one that ends at the rate tick by up to an hour and a half, so in short runs
 * more of them are cut off at `from`: sessions then show up without their `session.start`.
 */
export const generateEdotBrowserSessions = (
  range: Timerange,
  opts: DigitalExperienceScenarioOpts & { environment: string; from: number }
): Array<SynthtraceGenerator<EdotBrowserDocument>> => {
  const {
    environment,
    from,
    withSessionId,
    includeRawAttribution,
    environments: withEnvironments,
    edgeCases: withEdgeCases,
    replayRate,
    errorReplayRate,
    replaySize,
    sessionLength,
    ongoingSessions,
    scale,
    seed,
    signedInRate,
    frustration,
  } = opts;
  const { minPageViews, maxPageViews, dwell, maxDuration } = SESSION_LENGTHS[sessionLength];
  // Every option changes the sessions, so ongoing sessions are kept apart for each set of them
  const runKey = JSON.stringify(opts);
  return DIGITAL_EXPERIENCE_APPS.flatMap(
    ({
      serviceName,
      versions,
      health,
      incident,
      sessionsPerMinute,
      withoutEnvironment,
      environments: appEnvironments,
      site: appSite,
      browserWeights,
      signedInRate: appSignedInRate,
      accounts,
    }) => {
      const userCount = Math.max(
        MIN_USERS,
        Math.round(sessionsPerMinute * scale * USERS_PER_SESSION_PER_MINUTE)
      );
      const deployments: readonly DigitalExperienceEnvironment[] =
        withEnvironments && appEnvironments
          ? appEnvironments
          : [{ name: withoutEnvironment ? undefined : environment, weight: 1 }];
      const totalWeight = deployments.reduce((sum, { weight }) => sum + weight, 0);
      const healthProfile = edotBrowser.healthProfiles[health];
      // Each request fails by its own time, so a session that runs into an outage only fails
      // during it, wherever the session is placed. The outages cover every session of the run,
      // earlier visits included.
      const incidentOutages = incident && {
        url: incident.url,
        outages: incidentOutagesBetween(
          seed,
          serviceName,
          incident,
          range.from.getTime() - OUTAGE_MARGIN_SESSIONS * maxDuration,
          range.to.getTime() + OUTAGE_MARGIN_SESSIONS * maxDuration
        ),
      };

      return deployments.map((deployment) => {
        const { name, weight, exceptions, withoutExceptions, withoutResourceTimings } = deployment;
        const edgeCases = withEdgeCases ? DIGITAL_EXPERIENCE_EDGE_CASES[serviceName] : undefined;
        const deployedSite: EdotBrowserSite = {
          ...appSite,
          // Extra resources go last, so the app's own script stays its main one
          resources: [...(appSite.resources ?? []), ...(edgeCases?.resources ?? [])],
          pages: [...appSite.pages, ...(edgeCases?.pages ?? [])],
          exceptions: [
            ...(appSite.exceptions ?? []),
            ...(edgeCases?.exceptions ?? []),
            ...(exceptions ?? []),
          ],
        };
        const releases = versions.map((version) => ({
          weight: version.weight,
          app: edotBrowser.app({
            serviceName,
            serviceVersion: version.version,
            environment: name,
            distroVersion: withSessionId
              ? DISTRO_VERSION_WITH_SESSIONS
              : DISTRO_VERSION_WITHOUT_SESSIONS,
          }),
          site: siteOfVersion(deployedSite, version, incidentOutages),
        }));
        // The sessions of an app are the same whether or not it is spread over environments
        const sessionKey =
          deployments.length > 1 ? `${serviceName}:${name ?? 'no-environment'}` : serviceName;
        const reporting = {
          reportExceptions: !withoutExceptions,
          reportResourceTimings: !withoutResourceTimings,
        };
        const perMinute =
          ((sessionsPerMinute * scale * weight) / totalWeight) * PEAK_TRAFFIC_FACTOR;
        // Drawn apart from the session, like everything that doesn't depend on what it does
        const isInTraffic = (index: number): boolean =>
          createSeededRandom(`${seed}:${sessionKey}:${index}:traffic`)() <
          trafficShareAt(seed, serviceName, sessionTimeOf(index, perMinute));

        // The session numbered `index`, ending at `end`, without its events before `notBefore`
        const createSession = (
          index: number,
          end: number,
          { notBefore, includeReplay }: { notBefore: number; includeReplay: boolean }
        ): EdotBrowserEvent[] => {
          // The version comes from the session's number, so that a session in progress keeps it,
          // and so does a run that only simulates it to find its length
          const { app, site } = pickByWeight(
            createSeededRandom(`${seed}:${sessionKey}:${index}:version`),
            releases
          );
          const random = createSeededRandom(`${seed}:${sessionKey}:${index}`);
          const pageViews = minPageViews + Math.floor(random() * (maxPageViews - minPageViews + 1));
          const pickedProfile = edotBrowser.pickBrowserProfile(random, browserWeights);
          // Drawn apart from the session, so that the option doesn't change the rest of its draws
          const profile =
            edgeCases?.unidentifiedBrowserRate !== undefined &&
            createSeededRandom(`${seed}:${sessionKey}:${index}:browser`)() <
              edgeCases.unidentifiedBrowserRate
              ? edotBrowser.withoutBrowserDetails(pickedProfile)
              : pickedProfile;
          // Everything below is drawn even when it isn't used, so that options and the kind of
          // session don't change the rest of the draws of the session
          const [sessionId, previousSessionId, tabId, otherTabId] = Array.from({ length: 4 }, () =>
            randomUuid(random)
          );
          const visitKind = random();
          const followsOtherSession = random() < FOLLOW_UP_SESSION_RATE;
          const sameTab = random() < SAME_TAB_RATE;
          const gap = random();
          // Drawn apart from the session, like the browser above. Users need EDOT Browser's
          // sessions, and a few users have most of the sessions.
          const userRandom = createSeededRandom(`${seed}:${sessionKey}:${index}:user`);
          const [signedInDraw, userDraw, signInDraw] = [userRandom(), userRandom(), userRandom()];
          const user =
            withSessionId && signedInDraw < (signedInRate ?? appSignedInRate)
              ? appUser({ seed, serviceName, accounts }, Math.floor(userCount * userDraw ** 2))
              : undefined;
          const expired =
            visitKind >= RESUMED_SESSION_RATE &&
            visitKind < RESUMED_SESSION_RATE + EXPIRED_SESSION_RATE;
          // A user doesn't sign in on return to a session that expired: the expired session is one
          // of its own, which would be left anonymous, while the tab keeps the user across expiry.
          const signIn =
            user && !expired && signInDraw < SIGN_IN_DURING_SESSION_RATE
              ? { user, atDocument: 1 }
              : undefined;
          // Drawn apart from the session too, which then stays as it was without the option
          const frustrationRandom =
            withSessionId && frustration
              ? createSeededRandom(`${seed}:${sessionKey}:${index}:frustration`)
              : undefined;

          // A user who signs in during the session is anonymous until then, in every visit before
          const client = (options: EdotBrowserClientOptions = {}) =>
            app.client(profile, { includeRawAttribution, ...(signIn ? {} : { user }), ...options });
          // The visits of every session, in the tab each happened in: what replay records. A session
          // that expired has its own ID, so it records, or not, on its own.
          const visitsBySession = new Map<string, EdotBrowserReplayVisit[]>();
          // `last` is the visit that ends at the session's time, where a user who signs in does
          const simulate = (
            options: EdotBrowserClientOptions,
            anchor: { end: number },
            views: number,
            { resumed = false, last = false }: { resumed?: boolean; last?: boolean } = {}
          ) => {
            const visitClient = client(options);
            const { events, documents } = edotBrowser.sessionWithDocuments({
              site,
              health: healthProfile,
              random,
              client: visitClient,
              pageViews: views,
              dwell,
              resumed,
              ...(last && signIn ? { signIn } : {}),
              frustrationRandom,
              ...reporting,
              ...anchor,
            });
            if (options.sessionId) {
              visitsBySession.set(options.sessionId, [
                ...(visitsBySession.get(options.sessionId) ?? []),
                { client: visitClient, documents },
              ]);
            }
            return events;
          };
          const keep = (events: EdotBrowserEvent[]) =>
            events.filter((event) => getTimestamp(event) >= notBefore);
          // Replay has a random source of its own per session, so that it never changes the rest of
          // the data. Called after the visits are simulated. Segments that start before `notBefore`
          // are left out whole, since a segment without its first FullSnapshot can't play.
          const withReplay = (events: EdotBrowserEvent[]): EdotBrowserEvent[] => {
            if (!includeReplay) {
              return events;
            }
            return [
              ...events,
              ...Array.from(visitsBySession).flatMap(([replaySessionId, visits]) => {
                const trigger = getReplayTrigger(replaySessionId, replayRate, errorReplayRate);
                if (!trigger) {
                  return [];
                }
                const replayRandom = createSeededRandom(`${seed}:${replaySessionId}:replay`);
                const [packDraw, missingChunkDraw, lateDraw] = [
                  replayRandom(),
                  replayRandom(),
                  replayRandom(),
                ];
                return edotBrowser.replaySession({
                  visits,
                  trigger,
                  size: replaySize,
                  random: replayRandom,
                  packEvents: packDraw < PACKED_SESSION_RATE,
                  missingChunk: withEdgeCases && missingChunkDraw < MISSING_CHUNK_SESSION_RATE,
                  startsAfterFirstPage:
                    withEdgeCases && trigger === 'sampled' && lateDraw < LATE_REPLAY_SESSION_RATE,
                  notBefore,
                });
              }),
            ];
          };

          if (!withSessionId) {
            // Replay records carry the session ID, so there is no replay without one
            return keep(simulate({}, { end }, pageViews));
          }

          const previous = followsOtherSession ? previousSessionId : undefined;
          if (visitKind < RESUMED_SESSION_RATE) {
            // A second visit to a session that is still running, less than 30 minutes after the
            // first one, in the same tab or in another one
            const visit = simulate(
              { sessionId, previousSessionId: previous, tabId: sameTab ? tabId : otherTabId },
              { end },
              pageViews,
              { resumed: true, last: true }
            );
            const firstVisitEnd =
              Math.min(...visit.map(getTimestamp)) -
              Math.round((0.05 + 0.9 * gap) * SESSION_IDLE_TIMEOUT_MS);
            const firstVisit = simulate(
              { sessionId, previousSessionId: previous, tabId },
              { end: firstVisitEnd },
              EARLIER_VISIT_PAGE_VIEWS
            );
            return withReplay(keep([...firstVisit, ...visit]));
          }

          if (expired) {
            // The session expired while the tab stayed open, sending background requests with no
            // session ID. The user's return starts a new session that points to the expired one.
            const visit = simulate({ sessionId, previousSessionId, tabId }, { end }, pageViews, {
              last: true,
            });
            const returnedAt = Math.min(...visit.map(getTimestamp));
            const expiredFor = Math.round(SESSION_IDLE_TIMEOUT_MS * (1.05 + 2 * gap));
            const expiredVisit = simulate(
              { sessionId: previousSessionId, tabId },
              { end: returnedAt - expiredFor },
              EARLIER_VISIT_PAGE_VIEWS
            );
            const requestInterval = Math.floor(
              (expiredFor - SESSION_IDLE_TIMEOUT_MS) / IDLE_REQUEST_COUNT
            );
            const idleRequests = edotBrowser.idleTab({
              client: client({ tabId }),
              site,
              health: healthProfile,
              random,
              start: returnedAt - expiredFor + SESSION_IDLE_TIMEOUT_MS,
              requestCount: IDLE_REQUEST_COUNT,
              intervalMs: requestInterval,
              ...reporting,
            });
            return withReplay(keep([...expiredVisit, ...idleRequests, ...visit]));
          }

          return withReplay(
            keep(
              simulate({ sessionId, previousSessionId: previous, tabId }, { end }, pageViews, {
                last: true,
              })
            )
          );
        };

        if (ongoingSessions) {
          return generateOngoingPerMinute(range, perMinute, {
            store: ongoingBrowserSessions,
            key: `${runKey}:${sessionKey}`,
            maxDuration,
            create: ({ time, index, after }) => {
              if (!isInTraffic(index)) {
                return [];
              }
              // The session that ends at `time` without the option, moved to start there. Simulated
              // once to find its length, without replay, which has a random source of its own.
              const draft = createSession(index, time, {
                notBefore: -Infinity,
                includeReplay: false,
              });
              const end = time + (time - getStart(draft));
              return end < after
                ? []
                : createSession(index, end, { notBefore: from, includeReplay: true });
            },
          });
        }
        return generatePerMinute<EdotBrowserDocument>(range, perMinute, ({ time, index }) =>
          isInTraffic(index)
            ? createSession(index, time, { notBefore: from, includeReplay: true })
            : []
        );
      });
    }
  );
};
