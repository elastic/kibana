/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type Container, ContainerModule } from 'inversify';
import { injectionServiceMock } from '@kbn/core-di-mocks';
import { CoreSetup, Theme } from '@kbn/core-di-browser';
import { themeServiceMock } from '@kbn/core-theme-browser-mocks';
import { loadTheme } from './theme';

describe('loadTheme', () => {
  let container: Container;
  let theme: ReturnType<typeof themeServiceMock.createSetupContract>;

  beforeEach(() => {
    theme = themeServiceMock.createSetupContract();
    container = injectionServiceMock.createStartContract().getContainer();
    container.load(new ContainerModule(loadTheme));
    container.bind(CoreSetup('theme')).toConstantValue(theme);
  });

  it('should resolve the theme service', () => {
    expect(container.get(Theme)).toBe(theme);
  });
});
