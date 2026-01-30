/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { coreMock } from '@kbn/core/public/mocks';
import { licensingMock } from '@kbn/licensing-plugin/public/mocks';
import { FeedbackPlugin } from './plugin';

const mockInitializerContext = coreMock.createPluginInitializerContext();
const mockCoreStart = coreMock.createStart();
const mockLicensing = licensingMock.createStart();

const allowedRegisteredItems = ['securitySolutionQuestion1', 'securitySolutionQuestion2'];

describe('FeedbackPlugin', () => {
  it('should only allow registration of specific registered items', () => {
    const plugin = new FeedbackPlugin(mockInitializerContext);

    const { registeredItems } = plugin.start(mockCoreStart, { licensing: mockLicensing });

    expect(registeredItems).toEqual(allowedRegisteredItems);
  });
});
