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
  type EdotBrowserExceptionTemplate,
  type EdotBrowserPage,
  type EdotBrowserResource,
  type EdotBrowserStackFrame,
} from '@kbn/synthtrace-client';

/*
 * Values that are far from the usual, to see how the views cope with them. They come with the
 * `edgeCases` option of the digital experience scenarios and are modelled on what real sites send:
 * - URLs of tag managers, pixels, signed storage links and server-side rendered images, which
 *   run from a few hundred to several thousand characters. Browsers take up to 2 MB of URL, and
 *   IE's 2,083 characters is the figure that still shows up in tools.
 * - Stack traces as deep as the apps that raise the stack trace limit of V8 (10 frames by
 *   default), with minified function names, extension frames and anonymous functions.
 * - What isn't an error at all: a cross-origin "Script error." with no stack, a rejected promise
 *   with a plain value, and a stack the browser left empty.
 * - Messages with several lines, JSON and URLs in them, and text in other scripts.
 */

export interface DigitalExperienceEdgeCases {
  /** Loaded by the page loads of the app, a part of them, on top of its own resources. */
  resources?: readonly EdotBrowserResource[];
  /** Pages the app shows on top of its own. */
  pages?: readonly EdotBrowserPage[];
  /** Uncaught exceptions of the app, on top of its own. */
  exceptions?: readonly EdotBrowserExceptionTemplate[];
  /** Share of the sessions that come from a browser that EDOT Browser can't identify. */
  unidentifiedBrowserRate?: number;
}

const ALPHANUMERIC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const HEX = '0123456789abcdef';

/** A token that always reads the same, like the signatures and IDs in real URLs. */
const token = (key: string, length: number, alphabet: string = ALPHANUMERIC): string => {
  const random = createSeededRandom(`edge-case:${key}`);
  return Array.from({ length }, () => alphabet[Math.floor(random() * alphabet.length)]).join('');
};

const STOREFRONT_ORIGIN = 'https://www.example-store.com';
const STORE_CDN_ORIGIN = 'https://images.example-cdn.net';
const CHECKOUT_CDN_ORIGIN = 'https://cdn.example-store.com';
const MEDIA_ORIGIN = 'https://www.example-news.com';
const SUPPORT_ORIGIN = 'https://support.example-saas.com';

const encode = (value: string): string => encodeURIComponent(value);

const PRODUCT_URL = `${STOREFRONT_ORIGIN}/products/trail-running-shoes?utm_source=newsletter&utm_medium=email&utm_campaign=autumn-sale-2026&utm_content=hero-cta`;

// What Google Analytics 4 sends for a page view: over 800 characters
const GA4_COLLECT_URL = `https://www.google-analytics.com/g/collect?v=2&tid=G-STORE4821&gtm=45je5ba0v9100853572za200zb9100853572&_p=1762345678901&gcd=13l3l3l3l1l1&npa=0&dma=0&tag_exp=101509157~103116026~103200004~103233427~104684208~104684211~105087538~105087540~115938466~115938468&cid=1893347921.1762300000&ul=en-us&sr=1920x1080&uaa=x86&uab=64&uafvl=${encode(
  'Google Chrome;141.0.7390.55|Not?A_Brand;8.0.0.0|Chromium;141.0.7390.55'
)}&uamb=0&uam=&uap=macOS&uapv=15.1.0&uaw=0&are=1&frm=0&pscdl=noapi&_eu=AAAAAAQ&_s=3&sid=1762345600&sct=4&seg=1&dl=${encode(
  PRODUCT_URL
)}&dr=${encode('https://mail.example.com/')}&dt=${encode(
  'Trail Running Shoes | Example Store'
)}&en=page_view&_fv=1&_nsi=1&_ss=1&_ee=1&tfd=5124`;

const FACEBOOK_PIXEL_URL = `https://www.facebook.com/tr/?id=123456789012345&ev=PageView&dl=${encode(
  PRODUCT_URL
)}&rl=&if=false&ts=1762345678123&sw=1920&sh=1080&v=2.9.178&r=stable&a=tmgoogletagmanager&ec=0&o=4126&fbp=fb.1.1762300000000.1234567890&ler=empty&cdl=API_unavailable&it=1762345677000&coo=false&es=automatic&tm=3&rqm=GET`;

// A signed link to a private file, with the session token of temporary credentials: over 1,000
const S3_INVOICE_URL = `https://example-invoices.s3.eu-west-1.amazonaws.com/invoices/2026/11/ord-10482.pdf?response-content-disposition=${encode(
  'attachment; filename="invoice-ord-10482.pdf"'
)}&X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=${encode(
  'ASIAXZ3EXAMPLE7QK2W/20261105/eu-west-1/s3/aws4_request'
)}&X-Amz-Date=20261105T101500Z&X-Amz-Expires=900&X-Amz-Security-Token=${encode(
  `IQoJb3JpZ2luX2Vj${token('s3-token', 1100, `${ALPHANUMERIC}+/`)}=`
)}&X-Amz-SignedHeaders=host&X-Amz-Signature=${token('s3-signature', 64, HEX)}`;

// The image optimizer of a server-side rendering framework, which carries the source URL inside
const OPTIMIZED_IMAGE_URL = `${STOREFRONT_ORIGIN}/_next/image?url=${encode(
  `${STORE_CDN_ORIGIN}/store/catalog/footwear/trail-running/gallery/trail-running-shoes-side-view-3200x2400-v7.jpg?auto=format&fit=max&cs=srgb`
)}&w=3840&q=75`;

// An ad click that bounces through a redirector: over IE's 2,083 characters
const AD_CLICK_URL = `https://ad.example-ads.net/aclk?sa=L&ai=${token(
  'ad-ai',
  760,
  `${ALPHANUMERIC}-_`
)}&ae=2&num=1&cid=${token('ad-cid', 560, `${ALPHANUMERIC}-_`)}&sig=${token(
  'ad-sig',
  340,
  `${ALPHANUMERIC}-_`
)}&client=ca-pub-1234567890123456&nb=0&adurl=${encode(
  `${PRODUCT_URL}&gclid=${token('gclid', 90, `${ALPHANUMERIC}-_`)}&fbclid=${token(
    'fbclid',
    110,
    `${ALPHANUMERIC}-_`
  )}`
)}`;

// Search state kept in the URL, as a base64 payload: several thousand characters
const SEARCH_STATE = token('search-state', 4_300, `${ALPHANUMERIC}-_`);

// Apollo's automatic persisted queries over GET: the variables and the hash, both in the query
const GRAPHQL_PERSISTED_QUERY_URL = `${STOREFRONT_ORIGIN}/graphql?operationName=GetOrderHistory&variables=${encode(
  JSON.stringify({
    first: 20,
    after: 'Y3Vyc29yOjIw',
    filter: {
      status: ['SHIPPED', 'DELIVERED', 'RETURN_REQUESTED'],
      placedBetween: ['2025-11-01T00:00:00.000Z', '2026-11-05T23:59:59.999Z'],
      sort: { field: 'PLACED_AT', direction: 'DESC' },
    },
  })
)}&extensions=${encode(
  JSON.stringify({ persistedQuery: { version: 1, sha256Hash: token('apq', 64, HEX) } })
)}`;

const productPage = (page: number): EdotBrowserPage => ({
  path: `/products?page=${page}`,
  requests: [{ method: 'GET', url: `${STOREFRONT_ORIGIN}/api/products?page=${page}` }],
});

// Tailwind-style class names have colons in them, which a selector has to escape
const TAILWIND_SELECTOR =
  'div.flex.items-center.justify-between.px-4.py-2.md\\:px-6.lg\\:px-8 > button.bg-blue-500.hover\\:bg-blue-600.text-white.font-bold.py-2.px-4.rounded:nth-child(3)';

// A deep component tree, as a selector: over 600 characters
const DEEP_SELECTOR = [
  'html > body > div#__next > div.layout',
  ...Array.from(
    { length: 24 },
    (_, level) => `div.level-${level + 1}:nth-child(${(level % 5) + 1})`
  ),
  'button.btn.btn--primary.btn--large',
].join(' > ');

const TICKET_ID = token('ticket', 36, HEX);

const SKU_IDS: readonly string[] = Array.from({ length: 200 }, (_, i) => `sku-${10_000 + i * 7}`);

const MINIFIED_NAMES = [
  'Ha',
  'Ii',
  'bi',
  'ys',
  'Xo',
  'Zt',
  'qn',
  'Gn',
  'Yn',
  'Cs',
  '_s',
  'Ss',
  'Ls',
];

/** `count` nested calls, innermost first: a deep component tree, or a recursion that never ends. */
const nestedFrames = (
  functionNames: readonly string[],
  count: number,
  file?: string
): EdotBrowserStackFrame[] =>
  Array.from({ length: count }, (_, i) => ({
    functionName: functionNames[i % functionNames.length],
    file,
  }));

const CHECKOUT_CHUNK = `${CHECKOUT_CDN_ORIGIN}/static/js/chunks/checkout-payment-form~vendors-react-dom~app-shell.8f3a1b2c4d5e6f708192a3b4c5d6e7f8.chunk.js`;

// A browser extension that injects into the page and breaks, which the app can't do anything about
const EXTENSION_SCRIPT = 'chrome-extension://kfnmcaliepdbdkjhfplcongnbjglmeoa/js/content-script.js';

const GRAPHQL_ERROR_MESSAGE = `GraphQL error: ${JSON.stringify({
  errors: [
    {
      message: 'Cannot return null for non-nullable field Order.shippingAddress.',
      locations: [{ line: 12, column: 7 }],
      path: ['order', 'shippingAddress'],
      extensions: {
        code: 'INTERNAL_SERVER_ERROR',
        exception: {
          stacktrace: [
            'Error: Cannot return null for non-nullable field Order.shippingAddress.',
            '    at completeValue (/app/node_modules/graphql/execution/execute.js:560:13)',
            '    at executeField (/app/node_modules/graphql/execution/execute.js:488:19)',
            '    at executeFields (/app/node_modules/graphql/execution/execute.js:413:20)',
            '    at completeObjectValue (/app/node_modules/graphql/execution/execute.js:911:10)',
            '    at completeValue (/app/node_modules/graphql/execution/execute.js:660:12)',
            '    at /app/node_modules/graphql/execution/execute.js:497:11',
            '    at processTicksAndRejections (node:internal/process/task_queues:96:5)',
          ],
        },
      },
    },
  ],
  data: null,
})}`;

const HYDRATION_MESSAGE = `Hydration failed because the initial UI does not match what was rendered on the server.

See more info here: https://nextjs.org/docs/messages/react-hydration-error

  <CheckoutSummary>
    <div className="checkout-summary">
      <h2>
+       Order total
-       Gesamtsumme
      <span className="amount">
+       $59.00
-       59,00 €`;

export const DIGITAL_EXPERIENCE_EDGE_CASES: Readonly<Record<string, DigitalExperienceEdgeCases>> = {
  'storefront-web': {
    resources: [
      // Beacons and pixels with the page's details in the query
      { path: GA4_COLLECT_URL, initiatorType: 'other', sizeBytes: 100, probability: 0.8 },
      { path: FACEBOOK_PIXEL_URL, initiatorType: 'img', sizeBytes: 44, probability: 0.5 },
      { path: OPTIMIZED_IMAGE_URL, initiatorType: 'img', sizeBytes: 240_000, probability: 0.5 },
      { path: S3_INVOICE_URL, initiatorType: 'other', sizeBytes: 86_000, probability: 0.2 },
      { path: AD_CLICK_URL, initiatorType: 'other', sizeBytes: 300, probability: 0.15 },
      // One image in every size of its `srcset`
      ...[320, 640, 768, 1024, 1366, 1920, 2560, 3840].map(
        (width): EdotBrowserResource => ({
          path: `${STORE_CDN_ORIGIN}/store/catalog/footwear/trail-running/hero/autumn-2026-collection/trail-running-shoes-hero-2400x1600-v3.webp?w=${width}&q=75`,
          initiatorType: 'img',
          sizeBytes: width * 90,
          probability: 0.12,
        })
      ),
    ],
    pages: [
      // Pages of a list, each with its own URL
      ...[2, 3, 4, 5].map(productPage),
      {
        // A filtered search, with the filters in the URL
        path: '/search?q=waterproof+trail+running+shoes+wide+fit+size+10.5+men+gore-tex&sort=price_asc&brand=salomon&brand=hoka&brand=altra&color=black&color=blue&min_price=80&max_price=240&page=1&utm_source=newsletter&utm_medium=email&utm_campaign=autumn-sale-2026',
        requests: [
          { method: 'GET', url: GRAPHQL_PERSISTED_QUERY_URL },
          { method: 'GET', url: `${STOREFRONT_ORIGIN}/api/search?state=${SEARCH_STATE}` },
          // Two hundred products, each with its own URL: the table only has room for ten
          {
            method: 'GET',
            url: `${STOREFRONT_ORIGIN}/api/products/{id}/availability`,
            ids: SKU_IDS,
          },
        ],
        clickTargets: [
          { tagName: 'BUTTON', cssSelector: TAILWIND_SELECTOR },
          { tagName: 'BUTTON', cssSelector: DEEP_SELECTOR },
          // An element the instrumentation can't describe, like one inside a shadow root
          { tagName: 'DIV' },
        ],
      },
      {
        path: '/account/invoices',
        requests: [
          { method: 'PUT', url: S3_INVOICE_URL, failureRate: 0.1, failureStatusCodes: [403] },
        ],
      },
    ],
  },
  'checkout-web': {
    exceptions: [
      {
        // A render error from deep inside the tree of a minified bundle
        type: 'Error',
        message:
          'Objects are not valid as a React child (found: object with keys {id, amount, currency}). If you meant to render a collection of children, use an array instead.',
        weight: 4,
        stacks: [
          [
            ...nestedFrames(['Ha', 'Ii', 'bi'], 6),
            ...nestedFrames(MINIFIED_NAMES, 22),
            { functionName: 'MessagePort.performWorkUntilDeadline' },
          ],
        ],
      },
      {
        type: 'Error',
        message:
          'Minified React error #418; visit https://react.dev/errors/418?args[]=text&args[]= for the full message or use the non-minified dev environment for full errors and additional helpful warnings.',
        weight: 3,
        stacks: [[...nestedFrames(MINIFIED_NAMES, 9), { functionName: 'MessagePort.A' }]],
      },
      {
        type: 'Error',
        message: HYDRATION_MESSAGE,
        weight: 2,
        stacks: [nestedFrames(MINIFIED_NAMES, 12)],
      },
      {
        type: 'Error',
        message: GRAPHQL_ERROR_MESSAGE,
        weight: 2,
        stacks: [[{ functionName: 'ApolloLink.onError' }, { functionName: 'async fetchJson' }]],
      },
      {
        // The longest stack that still fits in the 8,191 characters the data stream indexes
        type: 'Error',
        message:
          'Too many re-renders. React limits the number of renders to prevent an infinite loop.',
        weight: 2,
        stacks: [nestedFrames(MINIFIED_NAMES, 48, CHECKOUT_CHUNK)],
      },
      {
        // Deep enough that the stack alone is over 8,191 characters, as with a raised stack limit.
        // The `wildcard` field of the data stream leaves it out of the index, so the errors of this
        // stack are missing from every list that groups by stack trace.
        type: 'Error',
        message: 'Maximum update depth exceeded',
        weight: 2,
        stacks: [nestedFrames(MINIFIED_NAMES, 80, CHECKOUT_CHUNK)],
      },
      {
        // V8 stops at ten frames, all of them the same function
        type: 'RangeError',
        message: 'Maximum call stack size exceeded',
        weight: 2,
        stacks: [nestedFrames(['formatCartTotal'], 10)],
      },
      {
        type: 'TypeError',
        message: `Failed to fetch dynamically imported module: ${CHECKOUT_CHUNK}`,
        weight: 2,
        stacks: [[{ functionName: '' }, { functionName: 'async loadPaymentForm' }]],
      },
      {
        // Cross-origin errors reach the page without a stack
        type: 'Error',
        message: 'Script error.',
        weight: 3,
        rawStacktrace: null,
      },
      {
        // The browser had nothing to say about where this one came from
        type: 'Error',
        message: 'ResizeObserver loop completed with undelivered notifications.',
        weight: 3,
        rawStacktrace: '',
      },
      {
        // A promise rejected with a plain value: no type, no stack
        message: 'Object Not Found Matching Id:1, MethodName:update, ParamCount:4',
        weight: 2,
        rawStacktrace: null,
      },
      {
        message: 'Timeout',
        weight: 2,
        rawStacktrace: null,
      },
      {
        // A `chrome-extension://` frame, in the V8 wording of the message
        type: 'TypeError',
        message: "Cannot read properties of null (reading 'type')",
        weight: 2,
        engines: ['chromium'],
        stacks: [
          [
            { functionName: 'e.exports', file: EXTENSION_SCRIPT, line: 1 },
            { functionName: '', file: EXTENSION_SCRIPT, line: 1 },
            { functionName: 'async Promise.all (index 0)', file: EXTENSION_SCRIPT, line: 1 },
          ],
        ],
      },
    ],
  },
  'media-portal-web': {
    resources: [
      // Paths and hosts that need escaping
      {
        path: `${MEDIA_ORIGIN}/images/${encode('東京の秋【2026】')}/${encode(
          'トップライン'
        )}.jpg?v=3`,
        initiatorType: 'img',
        sizeBytes: 140_000,
        probability: 0.4,
      },
      {
        path: 'https://xn--mnchen-3ya.example-news.com/assets/js/regional-widget.js',
        initiatorType: 'script',
        sizeBytes: 22_000,
        probability: 0.3,
      },
      {
        path: 'https://staging-cdn.example-news.com:8443/assets/js/preview-toolbar.js?token=abc123',
        initiatorType: 'script',
        sizeBytes: 12_000,
        probability: 0.2,
      },
      {
        path: `https://www.youtube.com/s/player/${token(
          'yt-player',
          8,
          HEX
        )}/player_ias.vflset/en_US/base.js`,
        initiatorType: 'script',
        sizeBytes: 2_100_000,
        probability: 0.25,
      },
      { path: AD_CLICK_URL, initiatorType: 'other', sizeBytes: 300, probability: 0.3 },
    ],
    pages: [
      {
        // News URLs carry the whole headline
        path: `/world/2026/11/05/${'government-announces-sweeping-new-measures-after-weeks-of-protests-across-the-country-and-calls-for-talks-with-opposition-leaders'}-live-updates?utm_source=app&utm_medium=push&utm_campaign=breaking-news&utm_content=${token(
          'push',
          60
        )}`,
        clickTargets: [{ tagName: 'A', cssSelector: DEEP_SELECTOR }, { tagName: 'IMG' }],
      },
    ],
    exceptions: [
      {
        type: 'TypeError',
        // The JavaScriptCore wording, so only Safari sessions throw it. The weight makes up for
        // the other engines, which would otherwise leave it far rarer than the other ones
        message: "undefined is not an object (evaluating 'window.webkit.messageHandlers')",
        weight: 12,
        engines: ['webkit'],
        stacks: [[{ functionName: 'postToApp' }, { functionName: 'shareArticle' }]],
      },
      { type: 'Error', message: 'Script error.', weight: 2, rawStacktrace: null },
      {
        type: 'Error',
        message: 'ResizeObserver loop completed with undelivered notifications.',
        weight: 2,
        rawStacktrace: '',
      },
    ],
    unidentifiedBrowserRate: 0.1,
  },
  'support-center-web': {
    pages: [
      {
        path: `/tickets/${TICKET_ID}?filters=${encode(
          JSON.stringify({
            status: ['open', 'pending'],
            assignee: 'me',
            tags: ['billing', 'refund', 'vip'],
          })
        )}`,
        requests: [{ method: 'GET', url: `${SUPPORT_ORIGIN}/api/tickets/${TICKET_ID}` }],
      },
    ],
    exceptions: [
      {
        // Hundreds of call sites in a minified bundle that each fail now and then: a long tail of
        // stacks, more than a list of 100 groups has room for
        type: 'TypeError',
        message: "Cannot read properties of undefined (reading 'items')",
        weight: 60,
        stacks: Array.from({ length: 150 }, (_, site) => [
          {
            functionName: `${MINIFIED_NAMES[site % MINIFIED_NAMES.length]}${site}`,
            file: `/static/js/chunk-${token(`chunk-${site % 12}`, 6, HEX)}.js`,
            line: 1,
            column: 2_000 + site * 137,
          },
          { functionName: 'Object.render', file: '/static/js/vendor.4f1c2a.js', line: 1 },
        ]),
      },
      {
        // Text in other scripts, and what no keyboard types
        type: 'Error',
        message:
          'Ungültiger Betreff "Überweisung fehlgeschlagen — 支払いエラー 😕 مرحبا" (U+200B:\u200B)',
        weight: 4,
        stacks: [[{ functionName: 'validateSubject' }, { functionName: 'TicketForm.onSubmit' }]],
      },
      { type: 'Error', message: '', weight: 3, stacks: [[{ functionName: 'onClose' }]] },
    ],
    unidentifiedBrowserRate: 0.15,
  },
  'docs-web': {
    resources: [
      {
        path: `https://docs.example-saas.com/_search/index-${token('search-index', 12, HEX)}.json`,
        initiatorType: 'other',
        sizeBytes: 3_800_000,
        probability: 0.3,
      },
    ],
    unidentifiedBrowserRate: 0.3,
  },
};
