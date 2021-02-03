/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { FieldFormatsService } from './field_formats_service';
import { DateFormat } from './converters/date_server';
import { coreMock } from '../../../../core/server/mocks';

describe('FieldFormatService', () => {
  test('DateFormat is server version', async () => {
    const service = new FieldFormatsService();
    const fieldFormatsService = await service.start();
    const uiSettings = coreMock.createStart().uiSettings.asScopedToClient({} as any);
    const fieldFormatsRegistry = await fieldFormatsService.fieldFormatServiceFactory(uiSettings);
    const DateFormatFromRegsitry = fieldFormatsRegistry.getTypeWithoutMetaParams('date');

    expect(DateFormatFromRegsitry).toEqual(DateFormat);
  });
});
