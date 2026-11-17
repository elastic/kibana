/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  getBrowserInfo,
  getEnvironmentDetails,
  getSnapshotTitle,
  getSpaceId,
  parseUserAgent,
} from './environment';
import { deserializeSnapshot } from './snapshot';

describe('parseUserAgent', () => {
  it.each([
    [
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
      { name: 'Chrome', version: '130.0.0.0', os: 'macOS' },
    ],
    [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.2849.68',
      { name: 'Edge', version: '130.0.2849.68', os: 'Windows' },
    ],
    [
      'Mozilla/5.0 (X11; Linux x86_64; rv:132.0) Gecko/20100101 Firefox/132.0',
      { name: 'Firefox', version: '132.0', os: 'Linux' },
    ],
    [
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15',
      { name: 'Safari', version: '18.1', os: 'macOS' },
    ],
    [
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1',
      { name: 'Safari', version: '18.1', os: 'iOS' },
    ],
    ['curl/8.0', { name: undefined, version: undefined, os: undefined }],
  ])('parses %s', (userAgent, expected) => {
    expect(parseUserAgent(userAgent)).toEqual(expected);
  });
});

describe('getBrowserInfo', () => {
  it('collects browser, screen and viewport details', () => {
    const win = {
      navigator: {
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64; rv:132.0) Gecko/20100101 Firefox/132.0',
        language: 'de-AT',
        languages: ['de-AT', 'en'],
      },
      screen: { width: 2560, height: 1440 },
      innerWidth: 1280,
      innerHeight: 720,
      devicePixelRatio: 2,
    } as unknown as Window;

    expect(getBrowserInfo(win)).toEqual({
      name: 'Firefox',
      version: '132.0',
      os: 'Linux',
      userAgent: win.navigator.userAgent,
      language: 'de-AT',
      languages: ['de-AT', 'en'],
      screen: { width: 2560, height: 1440 },
      viewport: { width: 1280, height: 720 },
      devicePixelRatio: 2,
    });
  });
});

describe('getSpaceId', () => {
  it.each([
    ['', '', 'default'],
    ['/s/marketing', '', 'marketing'],
    ['/abc/s/marketing', '/abc', 'marketing'],
    ['/abc', '/abc', 'default'],
  ])('returns the space of base path "%s"', (basePath, serverBasePath, expected) => {
    expect(getSpaceId(basePath, serverBasePath)).toBe(expected);
  });
});

describe('getEnvironmentDetails', () => {
  const meta = {
    kibanaVersion: '9.4.0',
    timezone: 'Europe/Vienna',
    locale: 'en',
    spaceId: 'default',
    kibana: { version: '9.4.0', buildNum: 1234, buildSha: 'abcdef1234567890', branch: 'main' },
    browser: { name: 'Chrome', version: '130.0.0.0', os: 'macOS' },
  };

  it('lists the known details and skips missing ones', () => {
    const details = getEnvironmentDetails(meta);
    expect(details.map(({ id, value }) => [id, value])).toEqual([
      ['kibana', '9.4.0'],
      ['build', '#1234 · abcdef123456 · branch main'],
      ['space', 'default'],
      ['timezone', 'Europe/Vienna'],
      ['locale', 'en'],
      ['browser', 'Chrome 130.0.0.0'],
      ['os', 'macOS'],
    ]);
    expect(details.every(({ current }) => current === undefined)).toBe(true);
  });

  it('marks values that differ from the current session', () => {
    const details = getEnvironmentDetails(meta, {
      ...meta,
      timezone: 'UTC',
      kibana: { ...meta.kibana, version: '9.5.0', buildFlavor: 'serverless' },
      browser: { name: 'Firefox', version: '132.0', os: 'macOS' },
    });
    expect(details.filter(({ current }) => current)).toEqual([
      { id: 'kibana', label: 'Kibana', value: '9.4.0', current: '9.5.0' },
      { id: 'timezone', label: 'Time zone', value: 'Europe/Vienna', current: 'UTC' },
      { id: 'browser', label: 'Browser', value: 'Chrome 130.0.0.0', current: 'Firefox 132.0' },
    ]);
  });

  it('only compares the build flavor when the snapshot has one', () => {
    const current = { kibana: { version: '9.4.0', buildFlavor: 'serverless' } };
    expect(getEnvironmentDetails({ kibanaVersion: '9.4.0' }, current)).toEqual([
      { id: 'kibana', label: 'Kibana', value: '9.4.0' },
    ]);
    expect(
      getEnvironmentDetails({ kibana: { version: '9.4.0', buildFlavor: 'traditional' } }, current)
    ).toEqual([{ id: 'kibana', label: 'Kibana', value: '9.4.0', current: '9.4.0 · Serverless' }]);
  });

  it('skips invalid dates and shows where replayed requests came from', () => {
    const details = getEnvironmentDetails({
      kibana: { version: '9.4.0', buildDate: 'not a date' },
      restoredFrom: { createdAt: 'not a date', kibanaVersion: '9.3.0' },
    });
    expect(details.map(({ id, value }) => [id, value])).toEqual([
      ['kibana', '9.4.0'],
      ['restoredFrom', 'Snapshot, Kibana 9.3.0'],
    ]);
  });

  it('falls back to kibanaVersion for snapshots without build info', () => {
    expect(getEnvironmentDetails({ kibanaVersion: '9.3.0' })).toEqual([
      { id: 'kibana', label: 'Kibana', value: '9.3.0' },
    ]);
  });
});

describe('snapshot environment validation', () => {
  const snapshot = (meta: Record<string, unknown>) =>
    JSON.stringify({
      version: 1,
      meta: { kibanaVersion: '9.4.0', createdAt: '2026-11-02T10:00:00.000Z', ...meta },
      requests: {},
    });

  it('keeps valid environment details', () => {
    const { meta } = deserializeSnapshot(
      snapshot({
        locale: 'en',
        browser: { name: 'Chrome', screen: { width: 1, height: 2 } },
      })
    );
    expect(meta.locale).toBe('en');
    expect(meta.browser).toEqual({ name: 'Chrome', screen: { width: 1, height: 2 } });
  });

  it('drops invalid environment details instead of rejecting the snapshot', () => {
    const { meta } = deserializeSnapshot(
      snapshot({ locale: 42, browser: { name: { evil: true }, version: '1' }, kibana: 'x' })
    );
    expect(meta.locale).toBeUndefined();
    expect(meta.kibana).toBeUndefined();
    expect(meta.browser).toEqual({ name: undefined, version: '1' });
  });
});

describe('getSnapshotTitle', () => {
  it('omits missing or invalid parts', () => {
    expect(getSnapshotTitle({ createdAt: 'nope', kibanaVersion: '' })).toBe('Snapshot');
    expect(getSnapshotTitle({ createdAt: 'nope', kibanaVersion: '9.4.0' }, 'Replaying')).toBe(
      'Replaying, Kibana 9.4.0'
    );
    expect(getSnapshotTitle({ createdAt: '2026-11-02T10:00:00.000Z' })).toMatch(
      /^Snapshot from .*2026/
    );
  });
});
