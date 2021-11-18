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
    test('it properly formats when no filters passed "showTrustedApps", "showEventFilters", and "showHostIsolationExceptions" is false', () => {
      const filter = getFilters({
        filters: {},
        namespaceTypes: ['single'],
        showTrustedApps: false,
        showEventFilters: false,
        showHostIsolationExceptions: false,
      });

      expect(filter).toEqual(
        '(not exception-list.attributes.list_id: endpoint_trusted_apps*) AND (not exception-list.attributes.list_id: endpoint_event_filters*) AND (not exception-list.attributes.list_id: endpoint_host_isolation_exceptions*)'
      );
    });
    test('it properly formats when no filters passed "showTrustedApps", "showEventFilters", and "showHostIsolationExceptions" is true', () => {
      const filter = getFilters({
        filters: {},
        namespaceTypes: ['single'],
        showTrustedApps: true,
        showEventFilters: true,
        showHostIsolationExceptions: true,
      });

      expect(filter).toEqual(
        '(exception-list.attributes.list_id: endpoint_trusted_apps*) AND (exception-list.attributes.list_id: endpoint_event_filters*) AND (exception-list.attributes.list_id: endpoint_host_isolation_exceptions*)'
      );
    });

    test('it properly formats when filters passed and "showTrustedApps", "showEventFilters" and "showHostIsolationExceptions" is false', () => {
      const filter = getFilters({
        filters: { created_by: 'moi', name: 'Sample' },
        namespaceTypes: ['single'],
        showTrustedApps: false,
        showEventFilters: false,
        showHostIsolationExceptions: false,
      });

      expect(filter).toEqual(
        '(exception-list.attributes.created_by:moi) AND (exception-list.attributes.name.text:Sample) AND (not exception-list.attributes.list_id: endpoint_trusted_apps*) AND (not exception-list.attributes.list_id: endpoint_event_filters*) AND (not exception-list.attributes.list_id: endpoint_host_isolation_exceptions*)'
      );
    });

    test('it properly formats when filters passed and "showTrustedApps", "showEventFilters" and "showHostIsolationExceptions" is true', () => {
      const filter = getFilters({
        filters: { created_by: 'moi', name: 'Sample' },
        namespaceTypes: ['single'],
        showTrustedApps: true,
        showEventFilters: true,
        showHostIsolationExceptions: true,
      });

      expect(filter).toEqual(
        '(exception-list.attributes.created_by:moi) AND (exception-list.attributes.name.text:Sample) AND (exception-list.attributes.list_id: endpoint_trusted_apps*) AND (exception-list.attributes.list_id: endpoint_event_filters*) AND (exception-list.attributes.list_id: endpoint_host_isolation_exceptions*)'
      );
    });

    test('it properly formats when no filters passed and "showTrustedApps" is true', () => {
      const filter = getFilters({
        filters: {},
        namespaceTypes: ['single'],
        showTrustedApps: true,
        showEventFilters: false,
        showHostIsolationExceptions: false,
      });

      expect(filter).toEqual(
        '(exception-list.attributes.list_id: endpoint_trusted_apps*) AND (not exception-list.attributes.list_id: endpoint_event_filters*) AND (not exception-list.attributes.list_id: endpoint_host_isolation_exceptions*)'
      );
    });

    test('it if filters passed and "showTrustedApps" is true', () => {
      const filter = getFilters({
        filters: { created_by: 'moi', name: 'Sample' },
        namespaceTypes: ['single'],
        showTrustedApps: true,
        showEventFilters: false,
        showHostIsolationExceptions: false,
      });

      expect(filter).toEqual(
        '(exception-list.attributes.created_by:moi) AND (exception-list.attributes.name.text:Sample) AND (exception-list.attributes.list_id: endpoint_trusted_apps*) AND (not exception-list.attributes.list_id: endpoint_event_filters*) AND (not exception-list.attributes.list_id: endpoint_host_isolation_exceptions*)'
      );
    });

    test('it properly formats when no filters passed and "showEventFilters" is true', () => {
      const filter = getFilters({
        filters: {},
        namespaceTypes: ['single'],
        showTrustedApps: false,
        showEventFilters: true,
        showHostIsolationExceptions: false,
      });

      expect(filter).toEqual(
        '(not exception-list.attributes.list_id: endpoint_trusted_apps*) AND (exception-list.attributes.list_id: endpoint_event_filters*) AND (not exception-list.attributes.list_id: endpoint_host_isolation_exceptions*)'
      );
    });

    test('it if filters passed and "showEventFilters" is true', () => {
      const filter = getFilters({
        filters: { created_by: 'moi', name: 'Sample' },
        namespaceTypes: ['single'],
        showTrustedApps: false,
        showEventFilters: true,
        showHostIsolationExceptions: false,
      });

      expect(filter).toEqual(
        '(exception-list.attributes.created_by:moi) AND (exception-list.attributes.name.text:Sample) AND (not exception-list.attributes.list_id: endpoint_trusted_apps*) AND (exception-list.attributes.list_id: endpoint_event_filters*) AND (not exception-list.attributes.list_id: endpoint_host_isolation_exceptions*)'
      );
    });

    test('it properly formats when no filters passed and "showHostIsolationExceptions" is true', () => {
      const filter = getFilters({
        filters: {},
        namespaceTypes: ['single'],
        showTrustedApps: false,
        showEventFilters: false,
        showHostIsolationExceptions: true,
      });

      expect(filter).toEqual(
        '(not exception-list.attributes.list_id: endpoint_trusted_apps*) AND (not exception-list.attributes.list_id: endpoint_event_filters*) AND (exception-list.attributes.list_id: endpoint_host_isolation_exceptions*)'
      );
    });

    test('it if filters passed and "showHostIsolationExceptions" is true', () => {
      const filter = getFilters({
        filters: { created_by: 'moi', name: 'Sample' },
        namespaceTypes: ['single'],
        showTrustedApps: false,
        showEventFilters: false,
        showHostIsolationExceptions: true,
      });

      expect(filter).toEqual(
        '(exception-list.attributes.created_by:moi) AND (exception-list.attributes.name.text:Sample) AND (not exception-list.attributes.list_id: endpoint_trusted_apps*) AND (not exception-list.attributes.list_id: endpoint_event_filters*) AND (exception-list.attributes.list_id: endpoint_host_isolation_exceptions*)'
      );
    });
  });

  describe('agnostic', () => {
    test('it properly formats when no filters passed and "showTrustedApps", "showEventFilters" and "showHostIsolationExceptions" is false', () => {
      const filter = getFilters({
        filters: {},
        namespaceTypes: ['agnostic'],
        showTrustedApps: false,
        showEventFilters: false,
        showHostIsolationExceptions: false,
      });

      expect(filter).toEqual(
        '(not exception-list-agnostic.attributes.list_id: endpoint_trusted_apps*) AND (not exception-list-agnostic.attributes.list_id: endpoint_event_filters*) AND (not exception-list-agnostic.attributes.list_id: endpoint_host_isolation_exceptions*)'
      );
    });

    test('it properly formats when no filters passed and "showTrustedApps", "showEventFilters" and "showHostIsolationExceptions" is true', () => {
      const filter = getFilters({
        filters: {},
        namespaceTypes: ['agnostic'],
        showTrustedApps: true,
        showEventFilters: true,
        showHostIsolationExceptions: true,
      });

      expect(filter).toEqual(
        '(exception-list-agnostic.attributes.list_id: endpoint_trusted_apps*) AND (exception-list-agnostic.attributes.list_id: endpoint_event_filters*) AND (exception-list-agnostic.attributes.list_id: endpoint_host_isolation_exceptions*)'
      );
    });

    test('it properly formats when filters passed and "showTrustedApps", "showEventFilters" and "showHostIsolationExceptions" is false', () => {
      const filter = getFilters({
        filters: { created_by: 'moi', name: 'Sample' },
        namespaceTypes: ['agnostic'],
        showTrustedApps: false,
        showEventFilters: false,
        showHostIsolationExceptions: false,
      });

      expect(filter).toEqual(
        '(exception-list-agnostic.attributes.created_by:moi) AND (exception-list-agnostic.attributes.name.text:Sample) AND (not exception-list-agnostic.attributes.list_id: endpoint_trusted_apps*) AND (not exception-list-agnostic.attributes.list_id: endpoint_event_filters*) AND (not exception-list-agnostic.attributes.list_id: endpoint_host_isolation_exceptions*)'
      );
    });
    test('it properly formats when filters passed and "showTrustedApps", "showEventFilters" and "showHostIsolationExceptions" is true', () => {
      const filter = getFilters({
        filters: { created_by: 'moi', name: 'Sample' },
        namespaceTypes: ['agnostic'],
        showTrustedApps: true,
        showEventFilters: true,
        showHostIsolationExceptions: true,
      });

      expect(filter).toEqual(
        '(exception-list-agnostic.attributes.created_by:moi) AND (exception-list-agnostic.attributes.name.text:Sample) AND (exception-list-agnostic.attributes.list_id: endpoint_trusted_apps*) AND (exception-list-agnostic.attributes.list_id: endpoint_event_filters*) AND (exception-list-agnostic.attributes.list_id: endpoint_host_isolation_exceptions*)'
      );
    });

    test('it properly formats when no filters passed and "showTrustedApps" is true', () => {
      const filter = getFilters({
        filters: {},
        namespaceTypes: ['agnostic'],
        showTrustedApps: true,
        showEventFilters: false,
        showHostIsolationExceptions: false,
      });

      expect(filter).toEqual(
        '(exception-list-agnostic.attributes.list_id: endpoint_trusted_apps*) AND (not exception-list-agnostic.attributes.list_id: endpoint_event_filters*) AND (not exception-list-agnostic.attributes.list_id: endpoint_host_isolation_exceptions*)'
      );
    });

    test('it if filters passed and "showTrustedApps" is true', () => {
      const filter = getFilters({
        filters: { created_by: 'moi', name: 'Sample' },
        namespaceTypes: ['agnostic'],
        showTrustedApps: true,
        showEventFilters: false,
        showHostIsolationExceptions: false,
      });

      expect(filter).toEqual(
        '(exception-list-agnostic.attributes.created_by:moi) AND (exception-list-agnostic.attributes.name.text:Sample) AND (exception-list-agnostic.attributes.list_id: endpoint_trusted_apps*) AND (not exception-list-agnostic.attributes.list_id: endpoint_event_filters*) AND (not exception-list-agnostic.attributes.list_id: endpoint_host_isolation_exceptions*)'
      );
    });

    test('it properly formats when no filters passed and "showEventFilters" is true', () => {
      const filter = getFilters({
        filters: {},
        namespaceTypes: ['agnostic'],
        showTrustedApps: false,
        showEventFilters: true,
        showHostIsolationExceptions: false,
      });

      expect(filter).toEqual(
        '(not exception-list-agnostic.attributes.list_id: endpoint_trusted_apps*) AND (exception-list-agnostic.attributes.list_id: endpoint_event_filters*) AND (not exception-list-agnostic.attributes.list_id: endpoint_host_isolation_exceptions*)'
      );
    });

    test('it if filters passed and "showEventFilters" is true', () => {
      const filter = getFilters({
        filters: { created_by: 'moi', name: 'Sample' },
        namespaceTypes: ['agnostic'],
        showTrustedApps: false,
        showEventFilters: true,
        showHostIsolationExceptions: false,
      });

      expect(filter).toEqual(
        '(exception-list-agnostic.attributes.created_by:moi) AND (exception-list-agnostic.attributes.name.text:Sample) AND (not exception-list-agnostic.attributes.list_id: endpoint_trusted_apps*) AND (exception-list-agnostic.attributes.list_id: endpoint_event_filters*) AND (not exception-list-agnostic.attributes.list_id: endpoint_host_isolation_exceptions*)'
      );
    });

    test('it properly formats when no filters passed and "showHostIsolationExceptions" is true', () => {
      const filter = getFilters({
        filters: {},
        namespaceTypes: ['agnostic'],
        showTrustedApps: false,
        showEventFilters: false,
        showHostIsolationExceptions: true,
      });

      expect(filter).toEqual(
        '(not exception-list-agnostic.attributes.list_id: endpoint_trusted_apps*) AND (not exception-list-agnostic.attributes.list_id: endpoint_event_filters*) AND (exception-list-agnostic.attributes.list_id: endpoint_host_isolation_exceptions*)'
      );
    });

    test('it if filters passed and "showHostIsolationExceptions" is true', () => {
      const filter = getFilters({
        filters: { created_by: 'moi', name: 'Sample' },
        namespaceTypes: ['agnostic'],
        showTrustedApps: false,
        showEventFilters: false,
        showHostIsolationExceptions: true,
      });

      expect(filter).toEqual(
        '(exception-list-agnostic.attributes.created_by:moi) AND (exception-list-agnostic.attributes.name.text:Sample) AND (not exception-list-agnostic.attributes.list_id: endpoint_trusted_apps*) AND (not exception-list-agnostic.attributes.list_id: endpoint_event_filters*) AND (exception-list-agnostic.attributes.list_id: endpoint_host_isolation_exceptions*)'
      );
    });
  });

  describe('single, agnostic', () => {
    test('it properly formats when no filters passed and "showTrustedApps", "showEventFilters" and "showHostIsolationExceptions" is false', () => {
      const filter = getFilters({
        filters: {},
        namespaceTypes: ['single', 'agnostic'],
        showTrustedApps: false,
        showEventFilters: false,
        showHostIsolationExceptions: false,
      });

      expect(filter).toEqual(
        '(not exception-list.attributes.list_id: endpoint_trusted_apps* AND not exception-list-agnostic.attributes.list_id: endpoint_trusted_apps*) AND (not exception-list.attributes.list_id: endpoint_event_filters* AND not exception-list-agnostic.attributes.list_id: endpoint_event_filters*) AND (not exception-list.attributes.list_id: endpoint_host_isolation_exceptions* AND not exception-list-agnostic.attributes.list_id: endpoint_host_isolation_exceptions*)'
      );
    });
    test('it properly formats when no filters passed and "showTrustedApps", "showEventFilters" and "showHostIsolationExceptions" is true', () => {
      const filter = getFilters({
        filters: {},
        namespaceTypes: ['single', 'agnostic'],
        showTrustedApps: true,
        showEventFilters: true,
        showHostIsolationExceptions: true,
      });

      expect(filter).toEqual(
        '(exception-list.attributes.list_id: endpoint_trusted_apps* OR exception-list-agnostic.attributes.list_id: endpoint_trusted_apps*) AND (exception-list.attributes.list_id: endpoint_event_filters* OR exception-list-agnostic.attributes.list_id: endpoint_event_filters*) AND (exception-list.attributes.list_id: endpoint_host_isolation_exceptions* OR exception-list-agnostic.attributes.list_id: endpoint_host_isolation_exceptions*)'
      );
    });

    test('it properly formats when filters passed and "showTrustedApps", "showEventFilters" and "showHostIsolationExceptions" is false', () => {
      const filter = getFilters({
        filters: { created_by: 'moi', name: 'Sample' },
        namespaceTypes: ['single', 'agnostic'],
        showTrustedApps: false,
        showEventFilters: false,
        showHostIsolationExceptions: false,
      });

      expect(filter).toEqual(
        '(exception-list.attributes.created_by:moi OR exception-list-agnostic.attributes.created_by:moi) AND (exception-list.attributes.name.text:Sample OR exception-list-agnostic.attributes.name.text:Sample) AND (not exception-list.attributes.list_id: endpoint_trusted_apps* AND not exception-list-agnostic.attributes.list_id: endpoint_trusted_apps*) AND (not exception-list.attributes.list_id: endpoint_event_filters* AND not exception-list-agnostic.attributes.list_id: endpoint_event_filters*) AND (not exception-list.attributes.list_id: endpoint_host_isolation_exceptions* AND not exception-list-agnostic.attributes.list_id: endpoint_host_isolation_exceptions*)'
      );
    });

    test('it properly formats when filters passed and "showTrustedApps", "showEventFilters" and "showHostIsolationExceptions" is true', () => {
      const filter = getFilters({
        filters: { created_by: 'moi', name: 'Sample' },
        namespaceTypes: ['single', 'agnostic'],
        showTrustedApps: true,
        showEventFilters: true,
        showHostIsolationExceptions: true,
      });

      expect(filter).toEqual(
        '(exception-list.attributes.created_by:moi OR exception-list-agnostic.attributes.created_by:moi) AND (exception-list.attributes.name.text:Sample OR exception-list-agnostic.attributes.name.text:Sample) AND (exception-list.attributes.list_id: endpoint_trusted_apps* OR exception-list-agnostic.attributes.list_id: endpoint_trusted_apps*) AND (exception-list.attributes.list_id: endpoint_event_filters* OR exception-list-agnostic.attributes.list_id: endpoint_event_filters*) AND (exception-list.attributes.list_id: endpoint_host_isolation_exceptions* OR exception-list-agnostic.attributes.list_id: endpoint_host_isolation_exceptions*)'
      );
    });

    test('it properly formats when no filters passed and "showTrustedApps" is true', () => {
      const filter = getFilters({
        filters: {},
        namespaceTypes: ['single', 'agnostic'],
        showTrustedApps: true,
        showEventFilters: false,
        showHostIsolationExceptions: false,
      });

      expect(filter).toEqual(
        '(exception-list.attributes.list_id: endpoint_trusted_apps* OR exception-list-agnostic.attributes.list_id: endpoint_trusted_apps*) AND (not exception-list.attributes.list_id: endpoint_event_filters* AND not exception-list-agnostic.attributes.list_id: endpoint_event_filters*) AND (not exception-list.attributes.list_id: endpoint_host_isolation_exceptions* AND not exception-list-agnostic.attributes.list_id: endpoint_host_isolation_exceptions*)'
      );
    });

    test('it properly formats when filters passed and "showTrustedApps" is true', () => {
      const filter = getFilters({
        filters: { created_by: 'moi', name: 'Sample' },
        namespaceTypes: ['single', 'agnostic'],
        showTrustedApps: true,
        showEventFilters: false,
        showHostIsolationExceptions: false,
      });

      expect(filter).toEqual(
        '(exception-list.attributes.created_by:moi OR exception-list-agnostic.attributes.created_by:moi) AND (exception-list.attributes.name.text:Sample OR exception-list-agnostic.attributes.name.text:Sample) AND (exception-list.attributes.list_id: endpoint_trusted_apps* OR exception-list-agnostic.attributes.list_id: endpoint_trusted_apps*) AND (not exception-list.attributes.list_id: endpoint_event_filters* AND not exception-list-agnostic.attributes.list_id: endpoint_event_filters*) AND (not exception-list.attributes.list_id: endpoint_host_isolation_exceptions* AND not exception-list-agnostic.attributes.list_id: endpoint_host_isolation_exceptions*)'
      );
    });

    test('it properly formats when no filters passed and "showEventFilters" is true', () => {
      const filter = getFilters({
        filters: {},
        namespaceTypes: ['single', 'agnostic'],
        showTrustedApps: false,
        showEventFilters: true,
        showHostIsolationExceptions: false,
      });

      expect(filter).toEqual(
        '(not exception-list.attributes.list_id: endpoint_trusted_apps* AND not exception-list-agnostic.attributes.list_id: endpoint_trusted_apps*) AND (exception-list.attributes.list_id: endpoint_event_filters* OR exception-list-agnostic.attributes.list_id: endpoint_event_filters*) AND (not exception-list.attributes.list_id: endpoint_host_isolation_exceptions* AND not exception-list-agnostic.attributes.list_id: endpoint_host_isolation_exceptions*)'
      );
    });

    test('it properly formats when filters passed and "showEventFilters" is true', () => {
      const filter = getFilters({
        filters: { created_by: 'moi', name: 'Sample' },
        namespaceTypes: ['single', 'agnostic'],
        showTrustedApps: false,
        showEventFilters: true,
        showHostIsolationExceptions: false,
      });

      expect(filter).toEqual(
        '(exception-list.attributes.created_by:moi OR exception-list-agnostic.attributes.created_by:moi) AND (exception-list.attributes.name.text:Sample OR exception-list-agnostic.attributes.name.text:Sample) AND (not exception-list.attributes.list_id: endpoint_trusted_apps* AND not exception-list-agnostic.attributes.list_id: endpoint_trusted_apps*) AND (exception-list.attributes.list_id: endpoint_event_filters* OR exception-list-agnostic.attributes.list_id: endpoint_event_filters*) AND (not exception-list.attributes.list_id: endpoint_host_isolation_exceptions* AND not exception-list-agnostic.attributes.list_id: endpoint_host_isolation_exceptions*)'
      );
    });
    test('it properly formats when no filters passed and "showHostIsolationExceptions" is true', () => {
      const filter = getFilters({
        filters: {},
        namespaceTypes: ['single', 'agnostic'],
        showTrustedApps: false,
        showEventFilters: false,
        showHostIsolationExceptions: true,
      });

      expect(filter).toEqual(
        '(not exception-list.attributes.list_id: endpoint_trusted_apps* AND not exception-list-agnostic.attributes.list_id: endpoint_trusted_apps*) AND (not exception-list.attributes.list_id: endpoint_event_filters* AND not exception-list-agnostic.attributes.list_id: endpoint_event_filters*) AND (exception-list.attributes.list_id: endpoint_host_isolation_exceptions* OR exception-list-agnostic.attributes.list_id: endpoint_host_isolation_exceptions*)'
      );
    });

    test('it properly formats when filters passed and "showHostIsolationExceptions" is true', () => {
      const filter = getFilters({
        filters: { created_by: 'moi', name: 'Sample' },
        namespaceTypes: ['single', 'agnostic'],
        showTrustedApps: false,
        showEventFilters: false,
        showHostIsolationExceptions: true,
      });

      expect(filter).toEqual(
        '(exception-list.attributes.created_by:moi OR exception-list-agnostic.attributes.created_by:moi) AND (exception-list.attributes.name.text:Sample OR exception-list-agnostic.attributes.name.text:Sample) AND (not exception-list.attributes.list_id: endpoint_trusted_apps* AND not exception-list-agnostic.attributes.list_id: endpoint_trusted_apps*) AND (not exception-list.attributes.list_id: endpoint_event_filters* AND not exception-list-agnostic.attributes.list_id: endpoint_event_filters*) AND (exception-list.attributes.list_id: endpoint_host_isolation_exceptions* OR exception-list-agnostic.attributes.list_id: endpoint_host_isolation_exceptions*)'
      );
    });
  });
});
