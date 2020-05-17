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

import { SavedObject } from 'src/core/server';
import { injectMetaAttributes } from './inject_meta_attributes';
import { managementMock } from '../services/management.mock';

describe('injectMetaAttributes', () => {
  let managementService: ReturnType<typeof managementMock.create>;

  beforeEach(() => {
    managementService = managementMock.create();

    managementService.getIcon.mockReturnValue('icon');
    managementService.getTitle.mockReturnValue('title');
    managementService.getEditUrl.mockReturnValue('editUrl');
    managementService.getInAppUrl.mockReturnValue({
      path: 'path',
      uiCapabilitiesPath: 'uiCapabilitiesPath',
    });
  });

  it('inject the metadata to the obj', () => {
    const obj: SavedObject<any> = {
      id: 'id',
      type: 'config',
      attributes: { some: 'value' },
      references: [],
    };

    const objWithMeta = injectMetaAttributes(obj, managementService);
    expect(objWithMeta).toStrictEqual({
      id: 'id',
      type: 'config',
      attributes: { some: 'value' },
      references: [],
      meta: {
        icon: 'icon',
        title: 'title',
        editUrl: 'editUrl',
        inAppUrl: {
          path: 'path',
          uiCapabilitiesPath: 'uiCapabilitiesPath',
        },
      },
    });
  });

  it('does not alter the original object', () => {
    const obj: SavedObject<any> = {
      id: 'id',
      type: 'config',
      attributes: { some: 'value' },
      references: [],
    };

    injectMetaAttributes(obj, managementService);

    expect(obj).toStrictEqual({
      id: 'id',
      type: 'config',
      attributes: { some: 'value' },
      references: [],
    });
  });
});
