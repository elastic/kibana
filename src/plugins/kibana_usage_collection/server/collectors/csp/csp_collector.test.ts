/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
    httpMock.csp = new CspConfig(config);
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

  test('fetches whether the csp rules have been changed or not', async () => {
    const collector = new Collector(logger, createCspCollector(httpMock));

    expect((await collector.fetch(mockedFetchContext)).rulesChangedFromDefault).toEqual(false);

    updateCsp({ rules: ['not', 'default'] });
    expect((await collector.fetch(mockedFetchContext)).rulesChangedFromDefault).toEqual(true);
  });

  test('does not include raw csp rules under any property names', async () => {
    const collector = new Collector(logger, createCspCollector(httpMock));

    // It's important that we do not send the value of csp.rules here as it
    // can be customized with values that can be identifiable to given
    // installs, such as URLs
    //
    // We use a snapshot here to ensure csp.rules isn't finding its way into the
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
