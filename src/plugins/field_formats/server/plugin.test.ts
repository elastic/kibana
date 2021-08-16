/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DateFormat } from './lib/converters/date_server';
import { coreMock } from '../../../core/server/mocks';
import { FieldFormatsPlugin } from './plugin';

describe('FieldFormats registry server plugin', () => {
  test('DateFormat is server version', async () => {
    const plugin = new FieldFormatsPlugin(coreMock.createPluginInitializerContext());
    const pluginStart = await plugin.start(coreMock.createStart());
    const uiSettings = coreMock.createStart().uiSettings.asScopedToClient({} as any);
    const fieldFormatsRegistry = await pluginStart.fieldFormatServiceFactory(uiSettings);
    const DateFormatFromRegsitry = fieldFormatsRegistry.getTypeWithoutMetaParams('date');

    expect(DateFormatFromRegsitry).toEqual(DateFormat);
  });
});
