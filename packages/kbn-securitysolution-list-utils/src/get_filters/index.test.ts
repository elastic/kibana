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
    test('it properly formats when no filters passed and "showTrustedApps" is false', () => {
      const filter = getFilters({}, ['single'], false, false);

      expect(filter).toEqual(
        '(not exception-list.attributes.list_id: endpoint_trusted_apps*) AND (not exception-list.attributes.list_id: endpoint_event_filters*)'
      );
    });

    test('it properly formats when no filters passed and "showTrustedApps" is true', () => {
      const filter = getFilters({}, ['single'], true, false);

      expect(filter).toEqual(
        '(exception-list.attributes.list_id: endpoint_trusted_apps*) AND (not exception-list.attributes.list_id: endpoint_event_filters*)'
      );
    });

    test('it properly formats when filters passed and "showTrustedApps" is false', () => {
      const filter = getFilters({ created_by: 'moi', name: 'Sample' }, ['single'], false, false);

      expect(filter).toEqual(
        '(exception-list.attributes.created_by:moi) AND (exception-list.attributes.name.text:Sample) AND (not exception-list.attributes.list_id: endpoint_trusted_apps*) AND (not exception-list.attributes.list_id: endpoint_event_filters*)'
      );
    });

    test('it if filters passed and "showTrustedApps" is true', () => {
      const filter = getFilters({ created_by: 'moi', name: 'Sample' }, ['single'], true, false);

      expect(filter).toEqual(
        '(exception-list.attributes.created_by:moi) AND (exception-list.attributes.name.text:Sample) AND (exception-list.attributes.list_id: endpoint_trusted_apps*) AND (not exception-list.attributes.list_id: endpoint_event_filters*)'
      );
    });

    test('it properly formats when no filters passed and "showEventFilters" is false', () => {
      const filter = getFilters({}, ['single'], false, false);

      expect(filter).toEqual(
        '(not exception-list.attributes.list_id: endpoint_trusted_apps*) AND (not exception-list.attributes.list_id: endpoint_event_filters*)'
      );
    });

    test('it properly formats when no filters passed and "showEventFilters" is true', () => {
      const filter = getFilters({}, ['single'], false, true);

      expect(filter).toEqual(
        '(not exception-list.attributes.list_id: endpoint_trusted_apps*) AND (exception-list.attributes.list_id: endpoint_event_filters*)'
      );
    });

    test('it properly formats when filters passed and "showEventFilters" is false', () => {
      const filter = getFilters({ created_by: 'moi', name: 'Sample' }, ['single'], false, false);

      expect(filter).toEqual(
        '(exception-list.attributes.created_by:moi) AND (exception-list.attributes.name.text:Sample) AND (not exception-list.attributes.list_id: endpoint_trusted_apps*) AND (not exception-list.attributes.list_id: endpoint_event_filters*)'
      );
    });

    test('it if filters passed and "showEventFilters" is true', () => {
      const filter = getFilters({ created_by: 'moi', name: 'Sample' }, ['single'], false, true);

      expect(filter).toEqual(
        '(exception-list.attributes.created_by:moi) AND (exception-list.attributes.name.text:Sample) AND (not exception-list.attributes.list_id: endpoint_trusted_apps*) AND (exception-list.attributes.list_id: endpoint_event_filters*)'
      );
    });
  });

  describe('agnostic', () => {
    test('it properly formats when no filters passed and "showTrustedApps" is false', () => {
      const filter = getFilters({}, ['agnostic'], false, false);

      expect(filter).toEqual(
        '(not exception-list-agnostic.attributes.list_id: endpoint_trusted_apps*) AND (not exception-list-agnostic.attributes.list_id: endpoint_event_filters*)'
      );
    });

    test('it properly formats when no filters passed and "showTrustedApps" is true', () => {
      const filter = getFilters({}, ['agnostic'], true, false);

      expect(filter).toEqual(
        '(exception-list-agnostic.attributes.list_id: endpoint_trusted_apps*) AND (not exception-list-agnostic.attributes.list_id: endpoint_event_filters*)'
      );
    });

    test('it properly formats when filters passed and "showTrustedApps" is false', () => {
      const filter = getFilters({ created_by: 'moi', name: 'Sample' }, ['agnostic'], false, false);

      expect(filter).toEqual(
        '(exception-list-agnostic.attributes.created_by:moi) AND (exception-list-agnostic.attributes.name.text:Sample) AND (not exception-list-agnostic.attributes.list_id: endpoint_trusted_apps*) AND (not exception-list-agnostic.attributes.list_id: endpoint_event_filters*)'
      );
    });

    test('it if filters passed and "showTrustedApps" is true', () => {
      const filter = getFilters({ created_by: 'moi', name: 'Sample' }, ['agnostic'], true, false);

      expect(filter).toEqual(
        '(exception-list-agnostic.attributes.created_by:moi) AND (exception-list-agnostic.attributes.name.text:Sample) AND (exception-list-agnostic.attributes.list_id: endpoint_trusted_apps*) AND (not exception-list-agnostic.attributes.list_id: endpoint_event_filters*)'
      );
    });

    test('it properly formats when no filters passed and "showEventFilters" is false', () => {
      const filter = getFilters({}, ['agnostic'], false, false);

      expect(filter).toEqual(
        '(not exception-list-agnostic.attributes.list_id: endpoint_trusted_apps*) AND (not exception-list-agnostic.attributes.list_id: endpoint_event_filters*)'
      );
    });

    test('it properly formats when no filters passed and "showEventFilters" is true', () => {
      const filter = getFilters({}, ['agnostic'], false, true);

      expect(filter).toEqual(
        '(not exception-list-agnostic.attributes.list_id: endpoint_trusted_apps*) AND (exception-list-agnostic.attributes.list_id: endpoint_event_filters*)'
      );
    });

    test('it properly formats when filters passed and "showEventFilters" is false', () => {
      const filter = getFilters({ created_by: 'moi', name: 'Sample' }, ['agnostic'], false, false);

      expect(filter).toEqual(
        '(exception-list-agnostic.attributes.created_by:moi) AND (exception-list-agnostic.attributes.name.text:Sample) AND (not exception-list-agnostic.attributes.list_id: endpoint_trusted_apps*) AND (not exception-list-agnostic.attributes.list_id: endpoint_event_filters*)'
      );
    });

    test('it if filters passed and "showEventFilters" is true', () => {
      const filter = getFilters({ created_by: 'moi', name: 'Sample' }, ['agnostic'], false, true);

      expect(filter).toEqual(
        '(exception-list-agnostic.attributes.created_by:moi) AND (exception-list-agnostic.attributes.name.text:Sample) AND (not exception-list-agnostic.attributes.list_id: endpoint_trusted_apps*) AND (exception-list-agnostic.attributes.list_id: endpoint_event_filters*)'
      );
    });
  });

  describe('single, agnostic', () => {
    test('it properly formats when no filters passed and "showTrustedApps" is false', () => {
      const filter = getFilters({}, ['single', 'agnostic'], false, false);

      expect(filter).toEqual(
        '(not exception-list.attributes.list_id: endpoint_trusted_apps* AND not exception-list-agnostic.attributes.list_id: endpoint_trusted_apps*) AND (not exception-list.attributes.list_id: endpoint_event_filters* AND not exception-list-agnostic.attributes.list_id: endpoint_event_filters*)'
      );
    });

    test('it properly formats when no filters passed and "showTrustedApps" is true', () => {
      const filter = getFilters({}, ['single', 'agnostic'], true, false);

      expect(filter).toEqual(
        '(exception-list.attributes.list_id: endpoint_trusted_apps* OR exception-list-agnostic.attributes.list_id: endpoint_trusted_apps*) AND (not exception-list.attributes.list_id: endpoint_event_filters* AND not exception-list-agnostic.attributes.list_id: endpoint_event_filters*)'
      );
    });

    test('it properly formats when filters passed and "showTrustedApps" is false', () => {
      const filter = getFilters(
        { created_by: 'moi', name: 'Sample' },
        ['single', 'agnostic'],
        false,
        false
      );

      expect(filter).toEqual(
        '(exception-list.attributes.created_by:moi OR exception-list-agnostic.attributes.created_by:moi) AND (exception-list.attributes.name.text:Sample OR exception-list-agnostic.attributes.name.text:Sample) AND (not exception-list.attributes.list_id: endpoint_trusted_apps* AND not exception-list-agnostic.attributes.list_id: endpoint_trusted_apps*) AND (not exception-list.attributes.list_id: endpoint_event_filters* AND not exception-list-agnostic.attributes.list_id: endpoint_event_filters*)'
      );
    });

    test('it properly formats when filters passed and "showTrustedApps" is true', () => {
      const filter = getFilters(
        { created_by: 'moi', name: 'Sample' },
        ['single', 'agnostic'],
        true,
        false
      );

      expect(filter).toEqual(
        '(exception-list.attributes.created_by:moi OR exception-list-agnostic.attributes.created_by:moi) AND (exception-list.attributes.name.text:Sample OR exception-list-agnostic.attributes.name.text:Sample) AND (exception-list.attributes.list_id: endpoint_trusted_apps* OR exception-list-agnostic.attributes.list_id: endpoint_trusted_apps*) AND (not exception-list.attributes.list_id: endpoint_event_filters* AND not exception-list-agnostic.attributes.list_id: endpoint_event_filters*)'
      );
    });

    test('it properly formats when no filters passed and "showEventFilters" is false', () => {
      const filter = getFilters({}, ['single', 'agnostic'], false, false);

      expect(filter).toEqual(
        '(not exception-list.attributes.list_id: endpoint_trusted_apps* AND not exception-list-agnostic.attributes.list_id: endpoint_trusted_apps*) AND (not exception-list.attributes.list_id: endpoint_event_filters* AND not exception-list-agnostic.attributes.list_id: endpoint_event_filters*)'
      );
    });

    test('it properly formats when no filters passed and "showEventFilters" is true', () => {
      const filter = getFilters({}, ['single', 'agnostic'], false, true);

      expect(filter).toEqual(
        '(not exception-list.attributes.list_id: endpoint_trusted_apps* AND not exception-list-agnostic.attributes.list_id: endpoint_trusted_apps*) AND (exception-list.attributes.list_id: endpoint_event_filters* OR exception-list-agnostic.attributes.list_id: endpoint_event_filters*)'
      );
    });

    test('it properly formats when filters passed and "showEventFilters" is false', () => {
      const filter = getFilters(
        { created_by: 'moi', name: 'Sample' },
        ['single', 'agnostic'],
        false,
        false
      );

      expect(filter).toEqual(
        '(exception-list.attributes.created_by:moi OR exception-list-agnostic.attributes.created_by:moi) AND (exception-list.attributes.name.text:Sample OR exception-list-agnostic.attributes.name.text:Sample) AND (not exception-list.attributes.list_id: endpoint_trusted_apps* AND not exception-list-agnostic.attributes.list_id: endpoint_trusted_apps*) AND (not exception-list.attributes.list_id: endpoint_event_filters* AND not exception-list-agnostic.attributes.list_id: endpoint_event_filters*)'
      );
    });

    test('it properly formats when filters passed and "showEventFilters" is true', () => {
      const filter = getFilters(
        { created_by: 'moi', name: 'Sample' },
        ['single', 'agnostic'],
        false,
        true
      );

      expect(filter).toEqual(
        '(exception-list.attributes.created_by:moi OR exception-list-agnostic.attributes.created_by:moi) AND (exception-list.attributes.name.text:Sample OR exception-list-agnostic.attributes.name.text:Sample) AND (not exception-list.attributes.list_id: endpoint_trusted_apps* AND not exception-list-agnostic.attributes.list_id: endpoint_trusted_apps*) AND (exception-list.attributes.list_id: endpoint_event_filters* OR exception-list-agnostic.attributes.list_id: endpoint_event_filters*)'
      );
    });
  });
});
