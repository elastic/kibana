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
import type { StoredLink, StoredLinksState, LinksState, ExternalLink } from './types';
import { EXTERNAL_LINK_TYPE } from '../../../../common/content_management/v1';

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
          { type: EXTERNAL_LINK_TYPE, destination: 'https://b.co', order: 2 },
          { type: EXTERNAL_LINK_TYPE, destination: 'https://a.co', order: 0 },
          { type: EXTERNAL_LINK_TYPE, destination: 'https://c.co', order: 1 },
        ])
      );

      const links = result.attributes.links!;
      expect(links.map((l) => l.destination)).toEqual([
        'https://a.co',
        'https://c.co',
        'https://b.co',
      ]);
      links.forEach((link) => {
        expect(link).not.toHaveProperty('order');
      });
    });

    it('treats missing order as 0 and preserves original array order for ties', () => {
      const result = savedObjectToItem(
        makeSavedObject([
          {
            type: EXTERNAL_LINK_TYPE,
            destination: 'https://third.co',
            order: 1,
          },
          { type: EXTERNAL_LINK_TYPE, destination: 'https://first.co' },
          {
            type: EXTERNAL_LINK_TYPE,
            destination: 'https://second.co',
          },
        ])
      );

      const links = result.attributes.links!;
      expect(links.map((l) => l.destination)).toEqual([
        'https://first.co',
        'https://second.co',
        'https://third.co',
      ]);
    });
  });

  describe('itemToAttributes', () => {
    it('sorts links by order and removes the order property', () => {
      const state = {
        links: [
          { type: EXTERNAL_LINK_TYPE, destination: 'https://z.co', order: 3 },
          { type: EXTERNAL_LINK_TYPE, destination: 'https://y.co', order: 1 },
          { type: EXTERNAL_LINK_TYPE, destination: 'https://x.co', order: 2 },
        ],
      };

      const { attributes } = itemToAttributes(state as LinksState);
      const links = attributes.links! as ExternalLink[];
      expect(links.map((l) => l.destination)).toEqual([
        'https://y.co',
        'https://x.co',
        'https://z.co',
      ]);
      links.forEach((link) => {
        expect(link).not.toHaveProperty('order');
      });
    });
  });
});
