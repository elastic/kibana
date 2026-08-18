/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Context } from '@kbn/cordis';
import SavedObjectsServerPlugin from './plugin';
import { uiSettings } from './ui_settings';

describe('SavedObjectsPlugin', () => {
  it('calls `registerSettings` with the correct parameters', async () => {
    const ctx = new Context();
    const mockUiSettings = { register: jest.fn() };
    ctx.provide('core.uiSettings', mockUiSettings);

    await ctx.plugin(SavedObjectsServerPlugin);

    expect(mockUiSettings.register).toHaveBeenCalledWith(uiSettings);
  });
});
