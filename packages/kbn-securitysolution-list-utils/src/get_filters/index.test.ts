/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getFilters } from '.';

describe('getFilters', () => {
  describe('single', () => {
    test('it properly formats when no filters and hide lists contains few list ids', () => {
      const filter = getFilters({
        filters: {},
        namespaceTypes: ['single'],
        hideLists: ['listId-1', 'listId-2', 'listId-3'],
      });

      expect(filter).toEqual(
        '(not exception-list.attributes.list_id: listId-1*) AND (not exception-list.attributes.list_id: listId-2*) AND (not exception-list.attributes.list_id: listId-3*)'
      );
    });
    test('it properly formats when no filters and hide lists contains one list id', () => {
      const filter = getFilters({
        filters: {},
        namespaceTypes: ['single'],
        hideLists: ['listId-1'],
      });

      expect(filter).toEqual('(not exception-list.attributes.list_id: listId-1*)');
    });
    test('it properly formats when no filters and no hide lists', () => {
      const filter = getFilters({
        filters: {},
        namespaceTypes: ['single'],
        hideLists: [],
      });

      expect(filter).toEqual('');
    });
    test('it properly formats when filters passed and hide lists contains few list ids', () => {
      const filter = getFilters({
        filters: { created_by: 'moi', name: 'Sample' },
        namespaceTypes: ['single'],
        hideLists: ['listId-1', 'listId-2', 'listId-3'],
      });

      expect(filter).toEqual(
        '(exception-list.attributes.created_by:moi) AND (exception-list.attributes.name.text:Sample) AND (not exception-list.attributes.list_id: listId-1*) AND (not exception-list.attributes.list_id: listId-2*) AND (not exception-list.attributes.list_id: listId-3*)'
      );
    });
    test('it properly formats when filters passed and hide lists contains one list id', () => {
      const filter = getFilters({
        filters: { created_by: 'moi', name: 'Sample' },
        namespaceTypes: ['single'],
        hideLists: ['listId-1'],
      });

      expect(filter).toEqual(
        '(exception-list.attributes.created_by:moi) AND (exception-list.attributes.name.text:Sample) AND (not exception-list.attributes.list_id: listId-1*)'
      );
    });
    test('it properly formats when filters passed and no hide lists', () => {
      const filter = getFilters({
        filters: { created_by: 'moi', name: 'Sample' },
        namespaceTypes: ['single'],
        hideLists: [],
      });

      expect(filter).toEqual(
        '(exception-list.attributes.created_by:moi) AND (exception-list.attributes.name.text:Sample)'
      );
    });
  });

  describe('agnostic', () => {
    test('it properly formats when no filters and hide lists contains few list ids', () => {
      const filter = getFilters({
        filters: {},
        namespaceTypes: ['agnostic'],
        hideLists: ['listId-1', 'listId-2', 'listId-3'],
      });

      expect(filter).toEqual(
        '(not exception-list-agnostic.attributes.list_id: listId-1*) AND (not exception-list-agnostic.attributes.list_id: listId-2*) AND (not exception-list-agnostic.attributes.list_id: listId-3*)'
      );
    });
    test('it properly formats when no filters and hide lists contains one list id', () => {
      const filter = getFilters({
        filters: {},
        namespaceTypes: ['agnostic'],
        hideLists: ['listId-1'],
      });

      expect(filter).toEqual('(not exception-list-agnostic.attributes.list_id: listId-1*)');
    });
    test('it properly formats when no filters and no hide lists', () => {
      const filter = getFilters({
        filters: {},
        namespaceTypes: ['agnostic'],
        hideLists: [],
      });

      expect(filter).toEqual('');
    });
    test('it properly formats when filters passed and hide lists contains few list ids', () => {
      const filter = getFilters({
        filters: { created_by: 'moi', name: 'Sample' },
        namespaceTypes: ['agnostic'],
        hideLists: ['listId-1', 'listId-2', 'listId-3'],
      });

      expect(filter).toEqual(
        '(exception-list-agnostic.attributes.created_by:moi) AND (exception-list-agnostic.attributes.name.text:Sample) AND (not exception-list-agnostic.attributes.list_id: listId-1*) AND (not exception-list-agnostic.attributes.list_id: listId-2*) AND (not exception-list-agnostic.attributes.list_id: listId-3*)'
      );
    });
    test('it properly formats when filters passed and hide lists contains one list id', () => {
      const filter = getFilters({
        filters: { created_by: 'moi', name: 'Sample' },
        namespaceTypes: ['agnostic'],
        hideLists: ['listId-1'],
      });

      expect(filter).toEqual(
        '(exception-list-agnostic.attributes.created_by:moi) AND (exception-list-agnostic.attributes.name.text:Sample) AND (not exception-list-agnostic.attributes.list_id: listId-1*)'
      );
    });
    test('it properly formats when filters passed and no hide lists', () => {
      const filter = getFilters({
        filters: { created_by: 'moi', name: 'Sample' },
        namespaceTypes: ['agnostic'],
        hideLists: [],
      });

      expect(filter).toEqual(
        '(exception-list-agnostic.attributes.created_by:moi) AND (exception-list-agnostic.attributes.name.text:Sample)'
      );
    });
  });

  describe('single, agnostic', () => {
    test('it properly formats when no filters and hide lists contains few list ids', () => {
      const filter = getFilters({
        filters: {},
        namespaceTypes: ['single', 'agnostic'],
        hideLists: ['listId-1', 'listId-2', 'listId-3'],
      });

      expect(filter).toEqual(
        '(not exception-list.attributes.list_id: listId-1* AND not exception-list-agnostic.attributes.list_id: listId-1*) AND (not exception-list.attributes.list_id: listId-2* AND not exception-list-agnostic.attributes.list_id: listId-2*) AND (not exception-list.attributes.list_id: listId-3* AND not exception-list-agnostic.attributes.list_id: listId-3*)'
      );
    });
    test('it properly formats when no filters and hide lists contains one list id', () => {
      const filter = getFilters({
        filters: {},
        namespaceTypes: ['single', 'agnostic'],
        hideLists: ['listId-1'],
      });

      expect(filter).toEqual(
        '(not exception-list.attributes.list_id: listId-1* AND not exception-list-agnostic.attributes.list_id: listId-1*)'
      );
    });
    test('it properly formats when no filters and no hide lists', () => {
      const filter = getFilters({
        filters: {},
        namespaceTypes: ['single', 'agnostic'],
        hideLists: [],
      });

      expect(filter).toEqual('');
    });
    test('it properly formats when filters passed and hide lists contains few list ids', () => {
      const filter = getFilters({
        filters: { created_by: 'moi', name: 'Sample' },
        namespaceTypes: ['single', 'agnostic'],
        hideLists: ['listId-1', 'listId-2', 'listId-3'],
      });

      expect(filter).toEqual(
        '(exception-list.attributes.created_by:moi OR exception-list-agnostic.attributes.created_by:moi) AND (exception-list.attributes.name.text:Sample OR exception-list-agnostic.attributes.name.text:Sample) AND (not exception-list.attributes.list_id: listId-1* AND not exception-list-agnostic.attributes.list_id: listId-1*) AND (not exception-list.attributes.list_id: listId-2* AND not exception-list-agnostic.attributes.list_id: listId-2*) AND (not exception-list.attributes.list_id: listId-3* AND not exception-list-agnostic.attributes.list_id: listId-3*)'
      );
    });
    test('it properly formats when filters passed and hide lists contains one list id', () => {
      const filter = getFilters({
        filters: { created_by: 'moi', name: 'Sample' },
        namespaceTypes: ['single', 'agnostic'],
        hideLists: ['listId-1'],
      });

      expect(filter).toEqual(
        '(exception-list.attributes.created_by:moi OR exception-list-agnostic.attributes.created_by:moi) AND (exception-list.attributes.name.text:Sample OR exception-list-agnostic.attributes.name.text:Sample) AND (not exception-list.attributes.list_id: listId-1* AND not exception-list-agnostic.attributes.list_id: listId-1*)'
      );
    });
    test('it properly formats when filters passed and no hide lists', () => {
      const filter = getFilters({
        filters: { created_by: 'moi', name: 'Sample' },
        namespaceTypes: ['single', 'agnostic'],
        hideLists: [],
      });

      expect(filter).toEqual(
        '(exception-list.attributes.created_by:moi OR exception-list-agnostic.attributes.created_by:moi) AND (exception-list.attributes.name.text:Sample OR exception-list-agnostic.attributes.name.text:Sample)'
      );
    });
  });
});
