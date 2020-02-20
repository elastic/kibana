/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
