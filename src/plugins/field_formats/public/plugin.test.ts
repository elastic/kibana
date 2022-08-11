/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { DateFormat } from './lib/converters/date';
import { FieldFormatsPlugin } from './plugin';

describe('FieldFormatsPublic', () => {
  test('DateFormat is public version', () => {
    const mockCore = coreMock.createSetup();
    const plugin = new FieldFormatsPlugin();
    plugin.setup(mockCore);
    const fieldFormatsRegistry = plugin.start();
    const DateFormatFromRegistry = fieldFormatsRegistry.getTypeWithoutMetaParams('date');

    expect(DateFormatFromRegistry).toEqual(DateFormat);
  });
});
