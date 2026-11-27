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

// The schema defaults core applies on traditional builds. The "treats the build flavor defaults
// as unchanged" test fails if this drifts from core.
const TRADITIONAL_DEFAULTS = {
  font_src: [`'self'`, 'data:'],
  img_src: ['data:', 'blob:', 'https:', 'http:'],
  media_src: [`'self'`, 'kibana.estccdn.com'],
};

// Serverless has no default for these directives
const SERVERLESS_DEFAULTS = { font_src: [], img_src: [], media_src: [] };

type DirectiveOverrides = Partial<typeof TRADITIONAL_DEFAULTS>;

describe('csp collector', () => {
  let httpMock: ReturnType<typeof httpServiceMock.createSetupContract>;
  // changed for consistency with expected implementation
  const mockedFetchContext = createCollectorFetchContextMock();

  // Builds the validated `csp.*` config the way core does on a traditional build, unless the
  // directive defaults are overridden
  function updateCsp(config: Partial<ICspConfig> & DirectiveOverrides) {
    httpMock.csp = new CspConfig({
      ...CspConfig.DEFAULT,
      form_action: [],
      worker_src: [],
      script_src: [],
      style_src: [],
      connect_src: [],
      default_src: [],
      frame_src: [],
      object_src: [],
      frame_ancestors: [],
      report_uri: [],
      report_to: [],
      ...TRADITIONAL_DEFAULTS,
      ...config,
    });
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

    updateCsp({ disableEmbedding: true });
    expect((await collector.fetch(mockedFetchContext)).rulesChangedFromDefault).toEqual(true);
  });

  test('treats the build flavor defaults as unchanged', async () => {
    const traditional = new Collector(logger, createCspCollector(httpMock, 'traditional'));
    updateCsp({});
    expect((await traditional.fetch(mockedFetchContext)).rulesChangedFromDefault).toEqual(false);

    const serverless = new Collector(logger, createCspCollector(httpMock, 'serverless'));
    updateCsp(SERVERLESS_DEFAULTS);
    expect((await serverless.fetch(mockedFetchContext)).rulesChangedFromDefault).toEqual(false);
    expect((await traditional.fetch(mockedFetchContext)).rulesChangedFromDefault).toEqual(true);
  });

  test('flags a configured csp.img_src as changed from the default', async () => {
    const collector = new Collector(logger, createCspCollector(httpMock, 'traditional'));

    updateCsp({ img_src: ['logos.example.test'] });
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
