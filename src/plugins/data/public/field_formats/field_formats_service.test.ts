/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { FieldFormatsService } from './field_formats_service';
import { coreMock } from '../../../../../src/core/public/mocks';
import { DateFormat } from './converters/date';

describe('FieldFormatService', () => {
  test('DateFormat is public version', () => {
    const mockCore = coreMock.createSetup();
    const service = new FieldFormatsService();
    service.setup(mockCore);
    const fieldFormatsRegistry = service.start();
    const DateFormatFromRegsitry = fieldFormatsRegistry.getTypeWithoutMetaParams('date');

    expect(DateFormatFromRegsitry).toEqual(DateFormat);
  });
});
