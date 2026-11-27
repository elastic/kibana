/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { VEGA_SAVED_OBJECT_TYPE } from '../common/constants';
import { VegaIcon } from './vega_icon';
import { getVegaLibraryVisTypeAlias } from './vega_library_vis_type_alias';

describe('getVegaLibraryVisTypeAlias', () => {
  it('lists library items next to legacy ones, but hides them from create menus', () => {
    const alias = getVegaLibraryVisTypeAlias(jest.fn());

    expect(alias).toEqual(
      expect.objectContaining({
        name: 'vegaLibrary',
        disableCreate: true,
        appExtensions: {
          visualizations: expect.objectContaining({ docTypes: [VEGA_SAVED_OBJECT_TYPE] }),
        },
      })
    );
  });

  it('opens the library editor for a listed item', () => {
    const openLibraryEditor = jest.fn();
    const { toListItem } =
      getVegaLibraryVisTypeAlias(openLibraryEditor).appExtensions.visualizations;

    const listItem = toListItem({
      id: 'item-1',
      type: VEGA_SAVED_OBJECT_TYPE,
      attributes: { title: 'My chart', description: 'A chart' },
      references: [],
      updatedAt: '2026-10-23T19:44:56.091Z',
      managed: true,
    });

    expect(listItem).toEqual(
      expect.objectContaining({
        id: 'item-1',
        title: 'My chart',
        description: 'A chart',
        updatedAt: '2026-10-23T19:44:56.091Z',
        managed: true,
        icon: VegaIcon,
        savedObjectType: VEGA_SAVED_OBJECT_TYPE,
        editor: { onEdit: openLibraryEditor },
      })
    );
  });
});
