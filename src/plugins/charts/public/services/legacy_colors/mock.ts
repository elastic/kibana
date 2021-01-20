/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { LegacyColorsService } from './colors';
import { coreMock } from '../../../../../core/public/mocks';

const colors = new LegacyColorsService();
colors.init(coreMock.createSetup().uiSettings);

export const colorsServiceMock: LegacyColorsService = {
  createColorLookupFunction: jest.fn(colors.createColorLookupFunction.bind(colors)),
  mappedColors: {
    mapKeys: jest.fn(),
    get: jest.fn(),
  },
} as any;
