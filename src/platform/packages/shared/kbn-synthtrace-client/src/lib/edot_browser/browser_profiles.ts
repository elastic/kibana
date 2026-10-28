/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface EdotBrowserResourceAttributes {
  'browser.name': string;
  'browser.version': string;
  'browser.platform': string;
  'browser.mobile': boolean;
  'browser.language': string;
  /** Only populated by Chromium-based browsers, which implement `navigator.userAgentData`. */
  'browser.brands'?: string[];
  'user_agent.original': string;
}

export interface BrowserProfile {
  id: BrowserProfileId;
  weight: number;
  resourceAttributes: EdotBrowserResourceAttributes;
}

export type BrowserProfileId =
  | 'chromeMacos'
  | 'edgeWindows'
  | 'firefoxLinux'
  | 'safariIos'
  | 'chromeAndroid';

const CHROMIUM_VERSION = '141';

export const BROWSER_PROFILES: Readonly<Record<BrowserProfileId, BrowserProfile>> = {
  chromeMacos: {
    id: 'chromeMacos',
    weight: 30,
    resourceAttributes: {
      'browser.name': 'Chrome',
      'browser.version': `${CHROMIUM_VERSION}.0.0.0`,
      'browser.platform': 'macOS',
      'browser.mobile': false,
      'browser.language': 'en-US',
      'browser.brands': [
        `Google Chrome ${CHROMIUM_VERSION}`,
        `Chromium ${CHROMIUM_VERSION}`,
        'Not?A_Brand 24',
      ],
      'user_agent.original': `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${CHROMIUM_VERSION}.0.0.0 Safari/537.36`,
    },
  },
  edgeWindows: {
    id: 'edgeWindows',
    weight: 25,
    resourceAttributes: {
      'browser.name': 'Edge',
      'browser.version': `${CHROMIUM_VERSION}.0.0.0`,
      'browser.platform': 'Windows',
      'browser.mobile': false,
      'browser.language': 'en-GB',
      'browser.brands': [
        `Microsoft Edge ${CHROMIUM_VERSION}`,
        `Chromium ${CHROMIUM_VERSION}`,
        'Not?A_Brand 24',
      ],
      'user_agent.original': `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${CHROMIUM_VERSION}.0.0.0 Safari/537.36 Edg/${CHROMIUM_VERSION}.0.0.0`,
    },
  },
  firefoxLinux: {
    id: 'firefoxLinux',
    weight: 8,
    resourceAttributes: {
      'browser.name': 'Firefox',
      'browser.version': '144.0',
      'browser.platform': 'Linux',
      'browser.mobile': false,
      'browser.language': 'de-DE',
      'user_agent.original':
        'Mozilla/5.0 (X11; Linux x86_64; rv:144.0) Gecko/20100101 Firefox/144.0',
    },
  },
  safariIos: {
    id: 'safariIos',
    weight: 20,
    resourceAttributes: {
      'browser.name': 'Safari',
      // EDOT Browser reads the version from the `Safari/` token, not `Version/`
      'browser.version': '604.1',
      'browser.platform': 'iOS',
      'browser.mobile': true,
      'browser.language': 'en-US',
      'user_agent.original':
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1',
    },
  },
  chromeAndroid: {
    id: 'chromeAndroid',
    weight: 17,
    resourceAttributes: {
      'browser.name': 'Chrome',
      'browser.version': `${CHROMIUM_VERSION}.0.0.0`,
      'browser.platform': 'Android',
      'browser.mobile': true,
      'browser.language': 'es-ES',
      'browser.brands': [
        `Google Chrome ${CHROMIUM_VERSION}`,
        `Chromium ${CHROMIUM_VERSION}`,
        'Not?A_Brand 24',
      ],
      'user_agent.original': `Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${CHROMIUM_VERSION}.0.0.0 Mobile Safari/537.36`,
    },
  },
};

/** Picks a browser profile by weight; `weightOverrides` lets an app skew its audience. */
export const pickBrowserProfile = (
  random: () => number = Math.random,
  weightOverrides: Partial<Record<BrowserProfileId, number>> = {}
): BrowserProfile => {
  const profiles = Object.values(BROWSER_PROFILES);
  const weights = profiles.map(({ id, weight }) => weightOverrides[id] ?? weight);
  const total = weights.reduce((sum, weight) => sum + weight, 0);

  let threshold = random() * total;
  for (let i = 0; i < profiles.length; i++) {
    threshold -= weights[i];
    if (threshold < 0) {
      return profiles[i];
    }
  }
  return profiles[profiles.length - 1];
};
