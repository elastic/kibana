/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { loggerMock } from '@kbn/logging-mocks';
import { SavedSearchStorage } from './saved_search_storage';
import type { SavedObject } from '@kbn/core/server';
import type { SavedSearchAttributes } from '../../common';

describe('SavedSearchStorage', () => {
  describe('savedObjectToItem', () => {
    it('Should backfill tabs array when missing', () => {
      const storage = new SavedSearchStorage({
        logger: loggerMock.create(),
        throwOnResultValidationError: true,
      });
      const so: SavedObject<SavedSearchAttributes> = {
        id: '1',
        type: 'search',
        attributes: {
          title: 'test',
          columns: ['col1', 'col2'],
        } as SavedSearchAttributes,
        references: [],
      };
      const result = storage.savedObjectToItem(so);
      expect(result).toEqual({
        id: '1',
        type: 'search',
        attributes: {
          title: 'test',
          columns: ['col1', 'col2'],
          tabs: [
            {
              id: 'd6d39211-83f9-51e6-8dc8-2739be72e026',
              label: 'Untitled',
              attributes: {
                columns: ['col1', 'col2'],
              },
            },
          ],
        },
        references: [],
      });
    });

    it('should not backfill tabs array when partial is true', () => {
      const storage = new SavedSearchStorage({
        logger: loggerMock.create(),
        throwOnResultValidationError: true,
      });
      const so: SavedObject<SavedSearchAttributes> = {
        id: '1',
        type: 'search',
        attributes: {
          title: 'test',
          columns: ['col1', 'col2'],
        } as SavedSearchAttributes,
        references: [],
      };
      const result = storage.savedObjectToItem(so, true);
      expect(result).toEqual({
        id: '1',
        type: 'search',
        attributes: {
          title: 'test',
          columns: ['col1', 'col2'],
        },
        references: [],
      });
    });

    it('should not backfill tabs array when already present', () => {
      const storage = new SavedSearchStorage({
        logger: loggerMock.create(),
        throwOnResultValidationError: true,
      });
      const so: SavedObject<SavedSearchAttributes> = {
        id: '1',
        type: 'search',
        attributes: {
          title: 'test',
          columns: ['col1', 'col2'],
          tabs: [
            {
              id: 'tab-1',
              label: 'My Tab',
              attributes: {
                columns: ['col1', 'col2'],
              },
            },
          ],
        } as SavedSearchAttributes,
        references: [],
      };
      const result = storage.savedObjectToItem(so);
      expect(result).toEqual({
        id: '1',
        type: 'search',
        attributes: {
          title: 'test',
          columns: ['col1', 'col2'],
          tabs: [
            {
              id: 'tab-1',
              label: 'My Tab',
              attributes: {
                columns: ['col1', 'col2'],
              },
            },
          ],
        },
        references: [],
      });
    });
  });
});
