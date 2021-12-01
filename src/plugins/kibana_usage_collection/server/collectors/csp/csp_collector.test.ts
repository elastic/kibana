/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CspConfig, ICspConfig } from '../../../../../core/server';
import { createCspCollector } from './csp_collector';
import { httpServiceMock, loggingSystemMock } from '../../../../../core/server/mocks';
import {
  Collector,
  createCollectorFetchContextMock,
} from 'src/plugins/usage_collection/server/mocks';

const logger = loggingSystemMock.createLogger();

describe('csp collector', () => {
  let httpMock: ReturnType<typeof httpServiceMock.createSetupContract>;
  // changed for consistency with expected implementation
  const mockedFetchContext = createCollectorFetchContextMock();

  function updateCsp(config: Partial<ICspConfig>) {
    httpMock.csp = new CspConfig({
      ...CspConfig.DEFAULT,
      style_src: [],
      worker_src: [],
      script_src: [],
      connect_src: [],
      default_src: [],
      font_src: [],
      frame_src: [],
      img_src: [],
      frame_ancestors: [],
      report_uri: [],
      report_to: [],
      ...config,
    });
  }

  beforeEach(() => {
    httpMock = httpServiceMock.createSetupContract();
  });

  test('fetches whether strict mode is enabled', async () => {
    const collector = new Collector(logger, createCspCollector(httpMock));

    expect((await collector.fetch(mockedFetchContext)).strict).toEqual(true);

    updateCsp({ strict: false });
    expect((await collector.fetch(mockedFetchContext)).strict).toEqual(false);
  });

  test('fetches whether the legacy browser warning is enabled', async () => {
    const collector = new Collector(logger, createCspCollector(httpMock));

    expect((await collector.fetch(mockedFetchContext)).warnLegacyBrowsers).toEqual(true);

    updateCsp({ warnLegacyBrowsers: false });
    expect((await collector.fetch(mockedFetchContext)).warnLegacyBrowsers).toEqual(false);
  });

  test("fetches whether the csp directives's rules have been changed or not", async () => {
    const collector = new Collector(logger, createCspCollector(httpMock));

    expect((await collector.fetch(mockedFetchContext)).rulesChangedFromDefault).toEqual(false);

    updateCsp({ disableEmbedding: true });
    expect((await collector.fetch(mockedFetchContext)).rulesChangedFromDefault).toEqual(true);
  });

  test('does not include raw csp rules under any property names', async () => {
    const collector = new Collector(logger, createCspCollector(httpMock));

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
