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

import { getSortingParams } from './sorting_params';

const MAPPINGS = {
  properties: {
    type: {
      type: 'text',
      fields: {
        raw: {
          type: 'keyword',
        },
      },
    },
    pending: {
      properties: {
        title: {
          type: 'text',
          fields: {
            raw: {
              type: 'keyword',
            },
          },
        },
      },
    },
    saved: {
      properties: {
        title: {
          type: 'text',
          fields: {
            raw: {
              type: 'keyword',
            },
          },
        },
        obj: {
          properties: {
            key1: {
              type: 'text',
            },
          },
        },
      },
    },
  },
};

describe('searchDsl/getSortParams', () => {
  describe('type, no sortField', () => {
    it('returns no params', () => {
      expect(getSortingParams(MAPPINGS, 'pending')).toEqual({});
    });
  });

  describe('type, order, no sortField', () => {
    it('returns no params', () => {
      expect(getSortingParams(MAPPINGS, 'saved', undefined, 'desc')).toEqual({});
    });
  });

  describe('sortField no direction', () => {
    describe('sortField is simple property with single type', () => {
      it('returns correct params', () => {
        expect(getSortingParams(MAPPINGS, 'saved', 'title')).toEqual({
          sort: [
            {
              'saved.title': {
                order: undefined,
                unmapped_type: 'text',
              },
            },
          ],
        });
      });
    });
    describe('sortField is simple root property with multiple types', () => {
      it('returns correct params', () => {
        expect(getSortingParams(MAPPINGS, ['saved', 'pending'], 'type')).toEqual({
          sort: [
            {
              type: {
                order: undefined,
                unmapped_type: 'text',
              },
            },
          ],
        });
      });
    });
    describe('sortField is simple non-root property with multiple types', () => {
      it('returns correct params', () => {
        expect(() =>
          getSortingParams(MAPPINGS, ['saved', 'pending'], 'title')
        ).toThrowErrorMatchingSnapshot();
      });
    });
    describe('sortField is multi-field with single type', () => {
      it('returns correct params', () => {
        expect(getSortingParams(MAPPINGS, 'saved', 'title.raw')).toEqual({
          sort: [
            {
              'saved.title.raw': {
                order: undefined,
                unmapped_type: 'keyword',
              },
            },
          ],
        });
      });
    });
    describe('sortField is multi-field with single type as array', () => {
      it('returns correct params', () => {
        expect(getSortingParams(MAPPINGS, ['saved'], 'title.raw')).toEqual({
          sort: [
            {
              'saved.title.raw': {
                order: undefined,
                unmapped_type: 'keyword',
              },
            },
          ],
        });
      });
    });
    describe('sortField is root multi-field with multiple types', () => {
      it('returns correct params', () => {
        expect(getSortingParams(MAPPINGS, ['saved', 'pending'], 'type.raw')).toEqual({
          sort: [
            {
              'type.raw': {
                order: undefined,
                unmapped_type: 'keyword',
              },
            },
          ],
        });
      });
    });
    describe('sortField is not-root multi-field with multiple types', () => {
      it('returns correct params', () => {
        expect(() =>
          getSortingParams(MAPPINGS, ['saved', 'pending'], 'title.raw')
        ).toThrowErrorMatchingSnapshot();
      });
    });
  });

  describe('sort with direction', () => {
    describe('sortField is simple property with single type', () => {
      it('returns correct params', () => {
        expect(getSortingParams(MAPPINGS, 'saved', 'title', 'desc')).toEqual({
          sort: [
            {
              'saved.title': {
                order: 'desc',
                unmapped_type: 'text',
              },
            },
          ],
        });
      });
    });
    describe('sortField is root simple property with single type', () => {
      it('returns correct params', () => {
        expect(getSortingParams(MAPPINGS, ['saved'], 'type', 'desc')).toEqual({
          sort: [
            {
              type: {
                order: 'desc',
                unmapped_type: 'text',
              },
            },
          ],
        });
      });
    });
    describe('sortField is root simple property with multiple type', () => {
      it('returns correct params', () => {
        expect(getSortingParams(MAPPINGS, ['saved', 'pending'], 'type', 'desc')).toEqual({
          sort: [
            {
              type: {
                order: 'desc',
                unmapped_type: 'text',
              },
            },
          ],
        });
      });
    });
    describe('sortFields is non-root simple property with multiple types', () => {
      it('returns correct params', () => {
        expect(() =>
          getSortingParams(MAPPINGS, ['saved', 'pending'], 'title', 'desc')
        ).toThrowErrorMatchingSnapshot();
      });
    });
    describe('sortField is multi-field with single type', () => {
      it('returns correct params', () => {
        expect(getSortingParams(MAPPINGS, 'saved', 'title.raw', 'asc')).toEqual({
          sort: [
            {
              'saved.title.raw': {
                order: 'asc',
                unmapped_type: 'keyword',
              },
            },
          ],
        });
      });
    });
    describe('sortField is root multi-field with multiple types', () => {
      it('returns correct params', () => {
        expect(getSortingParams(MAPPINGS, ['saved', 'pending'], 'type.raw', 'asc')).toEqual({
          sort: [
            {
              'type.raw': {
                order: 'asc',
                unmapped_type: 'keyword',
              },
            },
          ],
        });
      });
    });
    describe('sortField is non-root multi-field with multiple types', () => {
      it('returns correct params', () => {
        expect(() =>
          getSortingParams(MAPPINGS, ['saved', 'pending'], 'title.raw', 'asc')
        ).toThrowErrorMatchingSnapshot();
      });
    });
  });
});
