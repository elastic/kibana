/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { LegacyColorsService } from './colors';

const colors = new LegacyColorsService();
colors.init(coreMock.createSetup().uiSettings);

export const colorsServiceMock: LegacyColorsService = {
  createColorLookupFunction: jest.fn(colors.createColorLookupFunction.bind(colors)),
  mappedColors: {
    mapKeys: jest.fn(),
    get: jest.fn(),
    getColorFromConfig: jest.fn(),
  },
} as any;
