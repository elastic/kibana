/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type Container, ContainerModule } from 'inversify';
import { chromeServiceMock } from '@kbn/core-chrome-browser-mocks';
import { injectionServiceMock } from '@kbn/core-di-mocks';
import { CoreStart, DocTitle, RecentlyAccessed } from '@kbn/core-di-browser';
import { loadChrome } from './chrome';

describe('loadChrome', () => {
  let container: Container;
  let chrome: ReturnType<typeof chromeServiceMock.createStartContract>;

  beforeEach(() => {
    chrome = chromeServiceMock.createStartContract();
    container = injectionServiceMock.createStartContract().getContainer();
    container.load(new ContainerModule(loadChrome));
    container.bind(CoreStart('chrome')).toConstantValue(chrome);
  });

  it('should resolve the doc title service', () => {
    expect(container.get(DocTitle)).toBe(chrome.docTitle);
  });

  it('should resolve the recently accessed service', () => {
    expect(container.get(RecentlyAccessed)).toBe(chrome.recentlyAccessed);
  });
});
