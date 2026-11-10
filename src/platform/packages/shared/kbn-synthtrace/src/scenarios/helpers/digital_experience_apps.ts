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
  type EdotBrowserSite,
  type Fields,
  type HealthProfileName,
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

export interface DigitalExperienceApp {
  serviceName: string;
  serviceVersion: string;
  health: HealthProfileName;
  sessionsPerMinute: number;
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
}

const DEFAULT_SCENARIO_OPTS: Omit<DigitalExperienceScenarioOpts, 'seed'> = {
  withSessionId: true,
  includeRawAttribution: false,
  environments: false,
  edgeCases: false,
  scale: 1,
};

export const PRODUCTION_ENVIRONMENT = 'production';
const STAGING_ENVIRONMENT = 'staging';
const PREVIEW_ENVIRONMENT = 'preview';

const STOREFRONT_ORIGIN = 'https://www.example-store.com';
const CHECKOUT_ORIGIN = 'https://checkout.example-store.com';
const MEDIA_ORIGIN = 'https://www.example-news.com';
const SUPPORT_ORIGIN = 'https://support.example-saas.com';
const DOCS_ORIGIN = 'https://docs.example-saas.com';

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

export const DIGITAL_EXPERIENCE_APPS: readonly DigitalExperienceApp[] = [
  {
    serviceName: 'storefront-web',
    serviceVersion: '4.12.0',
    health: 'healthy',
    sessionsPerMinute: 6,
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
        },
        {
          path: '/products',
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
        {
          path: '/account/orders',
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
    serviceVersion: '2.3.1',
    health: 'erroring',
    sessionsPerMinute: 4,
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
            },
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
    serviceVersion: '7.0.4',
    health: 'slow',
    sessionsPerMinute: 4,
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
            },
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
    serviceVersion: '0.9.3',
    health: 'critical',
    sessionsPerMinute: 2,
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
          type: 'Error',
          message: 'ResizeObserver loop completed with undelivered notifications.',
          weight: 4,
          stacks: [[{ functionName: 'ResizeObserver.<anonymous>' }]],
        },
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
    serviceVersion: '1.0.0',
    health: 'healthy',
    sessionsPerMinute: 1,
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

type BooleanOptKey = 'withSessionId' | 'includeRawAttribution' | 'environments' | 'edgeCases';

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
    scale: parseScale(opts?.scale, DEFAULT_SCENARIO_OPTS.scale),
    seed: parseSeed(opts?.seed, getDefaultSeed(from)),
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
export const randomUuid = (random: () => number): string =>
  generateUuid({ random: Uint8Array.from({ length: 16 }, () => Math.floor(random() * 256)) });

/** The `@timestamp` of an event's first document. */
export const getTimestamp = (event: Serializable<Fields>): number =>
  Number(event.serialize()[0]['@timestamp']);

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

/**
 * One generator per app, and environment of the app, in the catalogue, each producing EDOT Browser
 * sessions over `range`. Without the `environments` option, an app only has the scenario's
 * `environment`, or none for the apps without one, and all of its traffic.
 * Sessions end at the time of their rate tick, so live mode never writes into the future.
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
  {
    environment,
    from,
    withSessionId,
    includeRawAttribution,
    environments: withEnvironments,
    edgeCases: withEdgeCases,
    scale,
    seed,
  }: DigitalExperienceScenarioOpts & { environment: string; from: number }
): Array<SynthtraceGenerator<EdotBrowserDocument>> =>
  DIGITAL_EXPERIENCE_APPS.flatMap(
    ({
      serviceName,
      serviceVersion,
      health,
      sessionsPerMinute,
      withoutEnvironment,
      environments: appEnvironments,
      site: appSite,
      browserWeights,
    }) => {
      const deployments: readonly DigitalExperienceEnvironment[] =
        withEnvironments && appEnvironments
          ? appEnvironments
          : [{ name: withoutEnvironment ? undefined : environment, weight: 1 }];
      const totalWeight = deployments.reduce((sum, { weight }) => sum + weight, 0);
      const healthProfile = edotBrowser.healthProfiles[health];

      return deployments.map((deployment) => {
        const { name, weight, exceptions, withoutExceptions, withoutResourceTimings } = deployment;
        const app = edotBrowser.app({
          serviceName,
          serviceVersion,
          environment: name,
          distroVersion: withSessionId
            ? DISTRO_VERSION_WITH_SESSIONS
            : DISTRO_VERSION_WITHOUT_SESSIONS,
        });
        const edgeCases = withEdgeCases ? DIGITAL_EXPERIENCE_EDGE_CASES[serviceName] : undefined;
        const site: EdotBrowserSite = {
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
        // The sessions of an app are the same whether or not it is spread over environments
        const sessionKey =
          deployments.length > 1 ? `${serviceName}:${name ?? 'no-environment'}` : serviceName;
        const reporting = {
          reportExceptions: !withoutExceptions,
          reportResourceTimings: !withoutResourceTimings,
        };

        return generatePerMinute<EdotBrowserDocument>(
          range,
          (sessionsPerMinute * scale * weight) / totalWeight,
          ({ time, index }) => {
            const random = createSeededRandom(`${seed}:${sessionKey}:${index}`);
            const pageViews =
              MIN_PAGE_VIEWS + Math.floor(random() * (MAX_PAGE_VIEWS - MIN_PAGE_VIEWS + 1));
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
            const [sessionId, previousSessionId, tabId, otherTabId] = Array.from(
              { length: 4 },
              () => randomUuid(random)
            );
            const visitKind = random();
            const followsOtherSession = random() < FOLLOW_UP_SESSION_RATE;
            const sameTab = random() < SAME_TAB_RATE;
            const gap = random();

            const client = (options: EdotBrowserClientOptions = {}) =>
              app.client(profile, { includeRawAttribution, ...options });
            const simulate = (
              options: EdotBrowserClientOptions,
              anchor: { end: number },
              views: number,
              resumed: boolean = false
            ) =>
              edotBrowser.session({
                site,
                health: healthProfile,
                random,
                client: client(options),
                pageViews: views,
                resumed,
                ...reporting,
                ...anchor,
              });
            const keep = (events: EdotBrowserEvent[]) =>
              events.filter((event) => getTimestamp(event) >= from);

            if (!withSessionId) {
              return keep(simulate({}, { end: time }, pageViews));
            }

            const previous = followsOtherSession ? previousSessionId : undefined;
            if (visitKind < RESUMED_SESSION_RATE) {
              // A second visit to a session that is still running, less than 30 minutes after the
              // first one, in the same tab or in another one
              const visit = simulate(
                { sessionId, previousSessionId: previous, tabId: sameTab ? tabId : otherTabId },
                { end: time },
                pageViews,
                true
              );
              const firstVisitEnd =
                Math.min(...visit.map(getTimestamp)) -
                Math.round((0.05 + 0.9 * gap) * SESSION_IDLE_TIMEOUT_MS);
              const firstVisit = simulate(
                { sessionId, previousSessionId: previous, tabId },
                { end: firstVisitEnd },
                EARLIER_VISIT_PAGE_VIEWS
              );
              return keep([...firstVisit, ...visit]);
            }

            if (visitKind < RESUMED_SESSION_RATE + EXPIRED_SESSION_RATE) {
              // The session expired while the tab stayed open, sending background requests with no
              // session ID. The user's return starts a new session that points to the expired one.
              const visit = simulate(
                { sessionId, previousSessionId, tabId },
                { end: time },
                pageViews
              );
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
              return keep([...expiredVisit, ...idleRequests, ...visit]);
            }

            return keep(
              simulate({ sessionId, previousSessionId: previous, tabId }, { end: time }, pageViews)
            );
          }
        );
      });
    }
  );
