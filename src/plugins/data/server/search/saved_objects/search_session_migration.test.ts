/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  searchSessionSavedObjectMigrations,
  SearchSessionSavedObjectAttributesPre$7$13$0,
  SearchSessionSavedObjectAttributesPre$7$14$0,
  SearchSessionSavedObjectAttributesPre$8$0$0,
} from './search_session_migration';
import { SavedObject } from 'src/core/types';
import { SEARCH_SESSION_TYPE, SearchSessionStatus } from 'src/plugins/data/common';
import { SavedObjectMigrationContext } from 'kibana/server';

describe('7.12.0 -> 7.13.0', () => {
  const mockCompletedSessionSavedObject: SavedObject<SearchSessionSavedObjectAttributesPre$7$13$0> =
    {
      id: 'id',
      type: SEARCH_SESSION_TYPE,
      attributes: {
        name: 'my_name',
        appId: 'my_app_id',
        sessionId: 'sessionId',
        urlGeneratorId: 'my_url_generator_id',
        initialState: {},
        restoreState: {},
        persisted: true,
        idMapping: {},
        realmType: 'realmType',
        realmName: 'realmName',
        username: 'username',
        created: '2021-03-26T00:00:00.000Z',
        expires: '2021-03-30T00:00:00.000Z',
        touched: '2021-03-29T00:00:00.000Z',
        status: SearchSessionStatus.COMPLETE,
      },
      references: [],
    };

  const mockInProgressSessionSavedObject: SavedObject<SearchSessionSavedObjectAttributesPre$7$13$0> =
    {
      id: 'id',
      type: SEARCH_SESSION_TYPE,
      attributes: {
        name: 'my_name',
        appId: 'my_app_id',
        sessionId: 'sessionId',
        urlGeneratorId: 'my_url_generator_id',
        initialState: {},
        restoreState: {},
        persisted: true,
        idMapping: {},
        realmType: 'realmType',
        realmName: 'realmName',
        username: 'username',
        created: '2021-03-26T00:00:00.000Z',
        expires: '2021-03-30T00:00:00.000Z',
        touched: '2021-03-29T00:00:00.000Z',
        status: SearchSessionStatus.IN_PROGRESS,
      },
      references: [],
    };

  const migration = searchSessionSavedObjectMigrations['7.13.0'];
  test('"completed" is populated from "touched" for completed session', () => {
    const migratedCompletedSession = migration(
      mockCompletedSessionSavedObject,
      {} as SavedObjectMigrationContext
    );

    expect(migratedCompletedSession.attributes).toHaveProperty('completed');
    expect(migratedCompletedSession.attributes.completed).toBe(
      migratedCompletedSession.attributes.touched
    );
    expect(migratedCompletedSession.attributes).toMatchInlineSnapshot(`
      Object {
        "appId": "my_app_id",
        "completed": "2021-03-29T00:00:00.000Z",
        "created": "2021-03-26T00:00:00.000Z",
        "expires": "2021-03-30T00:00:00.000Z",
        "idMapping": Object {},
        "initialState": Object {},
        "name": "my_name",
        "persisted": true,
        "realmName": "realmName",
        "realmType": "realmType",
        "restoreState": Object {},
        "sessionId": "sessionId",
        "status": "complete",
        "touched": "2021-03-29T00:00:00.000Z",
        "urlGeneratorId": "my_url_generator_id",
        "username": "username",
      }
    `);
  });

  test('"completed" is missing for in-progress session', () => {
    const migratedInProgressSession = migration(
      mockInProgressSessionSavedObject,
      {} as SavedObjectMigrationContext
    );

    expect(migratedInProgressSession.attributes).not.toHaveProperty('completed');

    expect(migratedInProgressSession.attributes).toEqual(
      mockInProgressSessionSavedObject.attributes
    );
  });
});

describe('7.13.0 -> 7.14.0', () => {
  const mockSessionSavedObject: SavedObject<SearchSessionSavedObjectAttributesPre$7$14$0> = {
    id: 'id',
    type: SEARCH_SESSION_TYPE,
    attributes: {
      name: 'my_name',
      appId: 'my_app_id',
      sessionId: 'sessionId',
      urlGeneratorId: 'my_url_generator_id',
      initialState: {},
      restoreState: {},
      persisted: true,
      idMapping: {},
      realmType: 'realmType',
      realmName: 'realmName',
      username: 'username',
      created: '2021-03-26T00:00:00.000Z',
      expires: '2021-03-30T00:00:00.000Z',
      touched: '2021-03-29T00:00:00.000Z',
      completed: '2021-03-29T00:00:00.000Z',
      status: SearchSessionStatus.COMPLETE,
    },
    references: [],
  };

  const migration = searchSessionSavedObjectMigrations['7.14.0'];
  test('version is populated', () => {
    const migratedSession = migration(mockSessionSavedObject, {} as SavedObjectMigrationContext);

    expect(migratedSession.attributes).toHaveProperty('version');
    expect(migratedSession.attributes.version).toBe('7.13.0');
    expect(migratedSession.attributes).toMatchInlineSnapshot(`
      Object {
        "appId": "my_app_id",
        "completed": "2021-03-29T00:00:00.000Z",
        "created": "2021-03-26T00:00:00.000Z",
        "expires": "2021-03-30T00:00:00.000Z",
        "idMapping": Object {},
        "initialState": Object {},
        "name": "my_name",
        "persisted": true,
        "realmName": "realmName",
        "realmType": "realmType",
        "restoreState": Object {},
        "sessionId": "sessionId",
        "status": "complete",
        "touched": "2021-03-29T00:00:00.000Z",
        "urlGeneratorId": "my_url_generator_id",
        "username": "username",
        "version": "7.13.0",
      }
    `);
  });
});

describe('7.14.0 -> 8.0.0', () => {
  const migration = searchSessionSavedObjectMigrations['8.0.0'];

  test('Discover app URL generator migrates to locator', () => {
    const mockSessionSavedObject: SavedObject<SearchSessionSavedObjectAttributesPre$8$0$0> = {
      id: 'id',
      type: SEARCH_SESSION_TYPE,
      attributes: {
        name: 'my_name',
        appId: 'my_app_id',
        sessionId: 'sessionId',
        urlGeneratorId: 'DISCOVER_APP_URL_GENERATOR',
        initialState: {},
        restoreState: {},
        persisted: true,
        idMapping: {},
        realmType: 'realmType',
        realmName: 'realmName',
        username: 'username',
        created: '2021-03-26T00:00:00.000Z',
        expires: '2021-03-30T00:00:00.000Z',
        touched: '2021-03-29T00:00:00.000Z',
        completed: '2021-03-29T00:00:00.000Z',
        status: SearchSessionStatus.COMPLETE,
        version: '7.14.0',
      },
      references: [],
    };

    const migratedSession = migration(mockSessionSavedObject, {} as SavedObjectMigrationContext);

    expect(migratedSession.attributes).toMatchInlineSnapshot(`
      Object {
        "appId": "my_app_id",
        "completed": "2021-03-29T00:00:00.000Z",
        "created": "2021-03-26T00:00:00.000Z",
        "expires": "2021-03-30T00:00:00.000Z",
        "idMapping": Object {},
        "initialState": Object {},
        "locatorId": "DISCOVER_APP_LOCATOR",
        "name": "my_name",
        "persisted": true,
        "realmName": "realmName",
        "realmType": "realmType",
        "restoreState": Object {},
        "sessionId": "sessionId",
        "status": "complete",
        "touched": "2021-03-29T00:00:00.000Z",
        "username": "username",
        "version": "7.14.0",
      }
    `);
  });

  test('Dashboard app URL generator migrates to locator', () => {
    const mockSessionSavedObject: SavedObject<SearchSessionSavedObjectAttributesPre$8$0$0> = {
      id: 'id',
      type: SEARCH_SESSION_TYPE,
      attributes: {
        name: 'my_name',
        appId: 'my_app_id',
        sessionId: 'sessionId',
        urlGeneratorId: 'DASHBOARD_APP_URL_GENERATOR',
        initialState: {},
        restoreState: {},
        persisted: true,
        idMapping: {},
        realmType: 'realmType',
        realmName: 'realmName',
        username: 'username',
        created: '2021-03-26T00:00:00.000Z',
        expires: '2021-03-30T00:00:00.000Z',
        touched: '2021-03-29T00:00:00.000Z',
        completed: '2021-03-29T00:00:00.000Z',
        status: SearchSessionStatus.COMPLETE,
        version: '7.14.0',
      },
      references: [],
    };

    const migratedSession = migration(mockSessionSavedObject, {} as SavedObjectMigrationContext);

    expect(migratedSession.attributes).toMatchInlineSnapshot(`
      Object {
        "appId": "my_app_id",
        "completed": "2021-03-29T00:00:00.000Z",
        "created": "2021-03-26T00:00:00.000Z",
        "expires": "2021-03-30T00:00:00.000Z",
        "idMapping": Object {},
        "initialState": Object {},
        "locatorId": "DASHBOARD_APP_LOCATOR",
        "name": "my_name",
        "persisted": true,
        "realmName": "realmName",
        "realmType": "realmType",
        "restoreState": Object {},
        "sessionId": "sessionId",
        "status": "complete",
        "touched": "2021-03-29T00:00:00.000Z",
        "username": "username",
        "version": "7.14.0",
      }
    `);
  });

  test('Undefined URL generator returns undefined locator', () => {
    const mockSessionSavedObject: SavedObject<SearchSessionSavedObjectAttributesPre$8$0$0> = {
      id: 'id',
      type: SEARCH_SESSION_TYPE,
      attributes: {
        name: 'my_name',
        appId: 'my_app_id',
        sessionId: 'sessionId',
        urlGeneratorId: undefined,
        initialState: {},
        restoreState: {},
        persisted: true,
        idMapping: {},
        realmType: 'realmType',
        realmName: 'realmName',
        username: 'username',
        created: '2021-03-26T00:00:00.000Z',
        expires: '2021-03-30T00:00:00.000Z',
        touched: '2021-03-29T00:00:00.000Z',
        completed: '2021-03-29T00:00:00.000Z',
        status: SearchSessionStatus.COMPLETE,
        version: '7.14.0',
      },
      references: [],
    };

    const migratedSession = migration(mockSessionSavedObject, {} as SavedObjectMigrationContext);

    expect(migratedSession.attributes).toMatchInlineSnapshot(`
      Object {
        "appId": "my_app_id",
        "completed": "2021-03-29T00:00:00.000Z",
        "created": "2021-03-26T00:00:00.000Z",
        "expires": "2021-03-30T00:00:00.000Z",
        "idMapping": Object {},
        "initialState": Object {},
        "locatorId": undefined,
        "name": "my_name",
        "persisted": true,
        "realmName": "realmName",
        "realmType": "realmType",
        "restoreState": Object {},
        "sessionId": "sessionId",
        "status": "complete",
        "touched": "2021-03-29T00:00:00.000Z",
        "username": "username",
        "version": "7.14.0",
      }
    `);
  });

  test('Other URL generator throws error', () => {
    const mockSessionSavedObject: SavedObject<SearchSessionSavedObjectAttributesPre$8$0$0> = {
      id: 'id',
      type: SEARCH_SESSION_TYPE,
      attributes: {
        name: 'my_name',
        appId: 'my_app_id',
        sessionId: 'sessionId',
        urlGeneratorId: 'my_url_generator_id',
        initialState: {},
        restoreState: {},
        persisted: true,
        idMapping: {},
        realmType: 'realmType',
        realmName: 'realmName',
        username: 'username',
        created: '2021-03-26T00:00:00.000Z',
        expires: '2021-03-30T00:00:00.000Z',
        touched: '2021-03-29T00:00:00.000Z',
        completed: '2021-03-29T00:00:00.000Z',
        status: SearchSessionStatus.COMPLETE,
        version: '7.14.0',
      },
      references: [],
    };

    expect(() =>
      migration(mockSessionSavedObject, {} as SavedObjectMigrationContext)
    ).toThrowErrorMatchingInlineSnapshot(
      `"No migration found for search session URL generator my_url_generator_id"`
    );
  });
});
