/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObject } from '@kbn/core-saved-objects-api-server';
import { savedObjectToItem, itemToAttributes } from './transform_utils';
import type { StoredLink, StoredLinksState, LinksState } from './types';
import { EXTERNAL_LINK_TYPE } from '../../../../common/content_management/v1';

jest.mock('uuid', () => ({
  v4: jest
    .fn()
    .mockReturnValueOnce('generated-id-1')
    .mockReturnValueOnce('generated-id-2')
    .mockReturnValueOnce('generated-id-3'),
}));

const makeSavedObject = (
  links: Array<StoredLink & { order?: number }>
): SavedObject<StoredLinksState> => ({
  id: 'test-so',
  type: 'links',
  attributes: { links },
  references: [],
});

describe('Links content management transform utils', () => {
  describe('savedObjectToItem', () => {
    it('sorts links by order and removes the order property', () => {
      const result = savedObjectToItem(
        makeSavedObject([
          { id: 'b', type: EXTERNAL_LINK_TYPE, destination: 'https://b.co', order: 2 },
          { id: 'a', type: EXTERNAL_LINK_TYPE, destination: 'https://a.co', order: 0 },
          { id: 'c', type: EXTERNAL_LINK_TYPE, destination: 'https://c.co', order: 1 },
        ])
      );

      const links = result.attributes.links!;
      expect(links.map((l) => l.id)).toEqual(['a', 'c', 'b']);
      links.forEach((link) => {
        expect(link).not.toHaveProperty('order');
      });
    });

    it('treats missing order as 0 and preserves original array order for ties', () => {
      const result = savedObjectToItem(
        makeSavedObject([
          {
            id: 'third',
            type: EXTERNAL_LINK_TYPE,
            destination: 'https://third.co',
            order: 1,
          },
          { id: 'first', type: EXTERNAL_LINK_TYPE, destination: 'https://first.co' },
          {
            id: 'second',
            type: EXTERNAL_LINK_TYPE,
            destination: 'https://second.co',
          },
        ])
      );

      const links = result.attributes.links!;
      expect(links.map((l) => l.id)).toEqual(['first', 'second', 'third']);
    });
  });

  describe('itemToAttributes', () => {
    it('sorts links by order and removes the order property', () => {
      const state = {
        links: [
          { id: 'z', type: EXTERNAL_LINK_TYPE, destination: 'https://z.co', order: 3 },
          { id: 'y', type: EXTERNAL_LINK_TYPE, destination: 'https://y.co', order: 1 },
          { id: 'x', type: EXTERNAL_LINK_TYPE, destination: 'https://x.co', order: 2 },
        ],
      };

      const { attributes } = itemToAttributes(state as LinksState);
      const links = attributes.links!;
      expect(links.map((l) => l.id)).toEqual(['y', 'x', 'z']);
      links.forEach((link) => {
        expect(link).not.toHaveProperty('order');
      });
    });

    it('generates an id for links that do not have one', () => {
      const state: LinksState = {
        links: [
          { type: EXTERNAL_LINK_TYPE, destination: 'https://no-id-1.co' },
          { id: 'existing-id', type: EXTERNAL_LINK_TYPE, destination: 'https://has-id.co' },
          { type: EXTERNAL_LINK_TYPE, destination: 'https://no-id-2.co' },
        ],
      };

      const { attributes } = itemToAttributes(state);
      const links = attributes.links!;

      expect(links[0].id).toBe('generated-id-1');
      expect(links[1].id).toBe('existing-id');
      expect(links[2].id).toBe('generated-id-2');
    });
  });
});
