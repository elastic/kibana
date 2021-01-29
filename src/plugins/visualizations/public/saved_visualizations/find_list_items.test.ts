/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { findListItems } from './find_list_items';
import { coreMock } from '../../../../core/public/mocks';
import { SavedObjectsClientContract } from '../../../../core/public';
import { VisTypeAlias } from '../vis_types';

describe('saved_visualizations', () => {
  function testProps() {
    const savedObjects = coreMock.createStart().savedObjects
      .client as jest.Mocked<SavedObjectsClientContract>;
    (savedObjects.find as jest.Mock).mockImplementation(() => ({
      total: 0,
      savedObjects: [],
    }));
    return {
      visTypes: [],
      search: '',
      size: 10,
      savedObjectsClient: savedObjects,
      mapSavedObjectApiHits: jest.fn(),
    };
  }

  it('searches visualization title and description', async () => {
    const props = testProps();
    const { find } = props.savedObjectsClient;
    await findListItems(props);
    expect(find.mock.calls).toMatchObject([
      [
        {
          type: ['visualization'],
          searchFields: ['title^3', 'description'],
        },
      ],
    ]);
  });

  it('searches searchFields and types specified by app extensions', async () => {
    const props = {
      ...testProps(),
      visTypes: [
        {
          appExtensions: {
            visualizations: {
              docTypes: ['bazdoc', 'etc'],
              searchFields: ['baz', 'bing'],
            },
          },
        } as VisTypeAlias,
      ],
    };
    const { find } = props.savedObjectsClient;
    await findListItems(props);
    expect(find.mock.calls).toMatchObject([
      [
        {
          type: ['bazdoc', 'etc', 'visualization'],
          searchFields: ['baz', 'bing', 'title^3', 'description'],
        },
      ],
    ]);
  });

  it('deduplicates types and search fields', async () => {
    const props = {
      ...testProps(),
      visTypes: [
        {
          appExtensions: {
            visualizations: {
              docTypes: ['bazdoc', 'bar'],
              searchFields: ['baz', 'bing', 'barfield'],
            },
          },
        } as VisTypeAlias,
        {
          appExtensions: {
            visualizations: {
              docTypes: ['visualization', 'foo', 'bazdoc'],
              searchFields: ['baz', 'bing', 'foofield'],
            },
          },
        } as VisTypeAlias,
      ],
    };
    const { find } = props.savedObjectsClient;
    await findListItems(props);
    expect(find.mock.calls).toMatchObject([
      [
        {
          type: ['bazdoc', 'bar', 'visualization', 'foo'],
          searchFields: ['baz', 'bing', 'barfield', 'foofield', 'title^3', 'description'],
        },
      ],
    ]);
  });

  it('searches the search term prefix', async () => {
    const props = {
      ...testProps(),
      search: 'ahoythere',
    };
    const { find } = props.savedObjectsClient;
    await findListItems(props);
    expect(find.mock.calls).toMatchObject([
      [
        {
          search: 'ahoythere*',
        },
      ],
    ]);
  });

  it('searches with references', async () => {
    const props = {
      ...testProps(),
      references: [
        { type: 'foo', id: 'hello' },
        { type: 'bar', id: 'dolly' },
      ],
    };
    const { find } = props.savedObjectsClient;
    await findListItems(props);
    expect(find.mock.calls).toMatchObject([
      [
        {
          hasReference: [
            { type: 'foo', id: 'hello' },
            { type: 'bar', id: 'dolly' },
          ],
        },
      ],
    ]);
  });

  it('uses type-specific toListItem function, if available', async () => {
    const props = {
      ...testProps(),
      mapSavedObjectApiHits(savedObject: {
        id: string;
        type: string;
        attributes: { title: string };
      }) {
        return {
          id: savedObject.id,
          title: `DEFAULT ${savedObject.attributes.title}`,
        };
      },
      visTypes: [
        {
          appExtensions: {
            visualizations: {
              docTypes: ['wizard'],
              toListItem(savedObject) {
                return {
                  id: savedObject.id,
                  title: `${(savedObject.attributes as { label: string }).label} THE GRAY`,
                };
              },
            },
          },
        } as VisTypeAlias,
      ],
    };

    (props.savedObjectsClient.find as jest.Mock).mockImplementationOnce(async () => ({
      total: 2,
      savedObjects: [
        {
          id: 'lotr',
          type: 'wizard',
          attributes: { label: 'Gandalf' },
        },
        {
          id: 'wat',
          type: 'visualization',
          attributes: { title: 'WATEVER' },
        },
      ],
    }));

    const items = await findListItems(props);
    expect(items).toEqual({
      total: 2,
      hits: [
        {
          id: 'lotr',
          title: 'Gandalf THE GRAY',
        },
        {
          id: 'wat',
          title: 'DEFAULT WATEVER',
        },
      ],
    });
  });
});
