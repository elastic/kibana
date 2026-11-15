/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ICspConfig } from '@kbn/core/server';
import { CspConfig } from '@kbn/core/server';
import { createCspCollector } from './csp_collector';
import { httpServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import {
  Collector,
  createCollectorFetchContextMock,
} from '@kbn/usage-collection-plugin/server/mocks';

const logger = loggingSystemMock.createLogger();

type CspAdditionalConfig = ConstructorParameters<typeof CspConfig>[1];

// What core adds to the traditional build when no `csp.img_src` is configured. The
// "treats the build flavor defaults as unchanged" test fails if this drifts from core.
const TRADITIONAL_DEFAULTS: CspAdditionalConfig = {
  font_src: [`'self'`, 'data:'],
  img_src: ['data:', 'blob:', 'https:', 'http:'],
  media_src: [`'self'`, 'kibana.estccdn.com'],
};

describe('csp collector', () => {
  let httpMock: ReturnType<typeof httpServiceMock.createSetupContract>;
  // changed for consistency with expected implementation
  const mockedFetchContext = createCollectorFetchContextMock();

  // Builds the config the way `HttpConfig` does: the `csp.*` settings plus the build flavor additions
  function updateCsp(
    config: Partial<ICspConfig> & { img_src?: string[] },
    ...moreConfigs: CspAdditionalConfig[]
  ) {
    httpMock.csp = new CspConfig(
      {
        ...CspConfig.DEFAULT,
        form_action: [],
        worker_src: [],
        script_src: [],
        style_src: [],
        connect_src: [],
        default_src: [],
        font_src: [],
        frame_src: [],
        img_src: [],
        object_src: [],
        media_src: [],
        frame_ancestors: [],
        report_uri: [],
        report_to: [],
        ...config,
      },
      ...moreConfigs
    );
  }

  beforeEach(() => {
    httpMock = httpServiceMock.createSetupContract();
    httpMock.csp = CspConfig.forBuildFlavor('traditional');
  });

  test('fetches whether strict mode is enabled', async () => {
    const collector = new Collector(logger, createCspCollector(httpMock, 'traditional'));

    expect((await collector.fetch(mockedFetchContext)).strict).toEqual(true);

    updateCsp({ strict: false });
    expect((await collector.fetch(mockedFetchContext)).strict).toEqual(false);
  });

  test('fetches whether the legacy browser warning is enabled', async () => {
    const collector = new Collector(logger, createCspCollector(httpMock, 'traditional'));

    expect((await collector.fetch(mockedFetchContext)).warnLegacyBrowsers).toEqual(true);

    updateCsp({ warnLegacyBrowsers: false });
    expect((await collector.fetch(mockedFetchContext)).warnLegacyBrowsers).toEqual(false);
  });

  test("fetches whether the csp directives's rules have been changed or not", async () => {
    const collector = new Collector(logger, createCspCollector(httpMock, 'traditional'));

    expect((await collector.fetch(mockedFetchContext)).rulesChangedFromDefault).toEqual(false);

    updateCsp({ disableEmbedding: true }, TRADITIONAL_DEFAULTS);
    expect((await collector.fetch(mockedFetchContext)).rulesChangedFromDefault).toEqual(true);
  });

  test('treats the build flavor defaults as unchanged', async () => {
    const traditional = new Collector(logger, createCspCollector(httpMock, 'traditional'));
    updateCsp({}, TRADITIONAL_DEFAULTS);
    expect((await traditional.fetch(mockedFetchContext)).rulesChangedFromDefault).toEqual(false);

    const serverless = new Collector(logger, createCspCollector(httpMock, 'serverless'));
    updateCsp({});
    expect((await serverless.fetch(mockedFetchContext)).rulesChangedFromDefault).toEqual(false);
    expect((await traditional.fetch(mockedFetchContext)).rulesChangedFromDefault).toEqual(true);
  });

  test('flags a configured csp.img_src as changed from the default', async () => {
    const collector = new Collector(logger, createCspCollector(httpMock, 'traditional'));

    // With `csp.img_src` set, core drops its img-src defaults and keeps the font and media ones
    updateCsp({ img_src: ['logos.example.test'] }, { ...TRADITIONAL_DEFAULTS, img_src: [] });
    expect((await collector.fetch(mockedFetchContext)).rulesChangedFromDefault).toEqual(true);
  });

  test('does not include raw csp rules under any property names', async () => {
    const collector = new Collector(logger, createCspCollector(httpMock, 'traditional'));

    // It's important that we do not send the raw values of csp cirectives here as they
    // can be customized with values that can be identifiable to given
    // installs, such as URLs
    //
    // We use a snapshot here to ensure raw values aren't finding their way into the
    // payload under some new and unexpected variable name (e.g. cspRules).
    expect(await collector.fetch(mockedFetchContext)).toMatchInlineSnapshot(`
      Object {
        "rulesChangedFromDefault": false,
        "strict": true,
        "warnLegacyBrowsers": true,
      }
    `);
  });
});
