/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObject } from '@kbn/core/server';
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
    managementService.getNamespaceType.mockReturnValue('single');
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
        namespaceType: 'single',
        hiddenType: false,
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
