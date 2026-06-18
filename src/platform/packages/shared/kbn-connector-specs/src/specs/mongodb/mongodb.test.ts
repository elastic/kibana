/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../connector_spec';
import { getConnectorSpec } from '../../..';
import { MongoDBConnector } from './mongodb';

// ---------------------------------------------------------------------------
// Mock the mongodb driver (dynamic import)
// Jest hoists jest.mock() calls so they intercept dynamic import() as well.
// ---------------------------------------------------------------------------

const mockCountDocuments = jest.fn();
const mockFindToArray = jest.fn();
const mockAggregateToArray = jest.fn();
const mockListCollections = jest.fn();
const mockListCollectionsToArray = jest.fn();
const mockCommand = jest.fn();
const mockConnect = jest.fn();
const mockClose = jest.fn();
const mockDb = jest.fn();
const mockCollection = jest.fn();

jest.mock('mongodb', () => ({
  MongoClient: jest.fn().mockImplementation(() => ({
    connect: mockConnect,
    db: mockDb,
    close: mockClose,
  })),
}));

// ---------------------------------------------------------------------------
// Test context
// ---------------------------------------------------------------------------

const mockContext = {
  client: {} as ActionContext['client'], // unused — connector uses native driver
  config: { database: 'test_db' },
  secrets: { connectionString: 'mongodb://localhost:27017' },
  log: { debug: jest.fn(), error: jest.fn(), warn: jest.fn() },
} as unknown as ActionContext;

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();

  mockConnect.mockResolvedValue(undefined);
  mockClose.mockResolvedValue(undefined);
  mockCommand.mockResolvedValue({ ok: 1 });

  // db() returns an object with collection(), listCollections(), and command()
  mockListCollections.mockReturnValue({ toArray: mockListCollectionsToArray });
  mockDb.mockReturnValue({
    collection: mockCollection,
    listCollections: mockListCollections,
    command: mockCommand,
  });

  // collection() returns an object with find/aggregate/countDocuments
  mockCollection.mockReturnValue({
    find: jest.fn().mockReturnValue({ toArray: mockFindToArray }),
    aggregate: jest.fn().mockReturnValue({ toArray: mockAggregateToArray }),
    countDocuments: mockCountDocuments,
  });

  mockFindToArray.mockResolvedValue([]);
  mockAggregateToArray.mockResolvedValue([]);
  mockCountDocuments.mockResolvedValue(0);
  mockListCollectionsToArray.mockResolvedValue([]);
});

// ---------------------------------------------------------------------------
// Metadata and wiring
// ---------------------------------------------------------------------------

describe('MongoDBConnector metadata and wiring', () => {
  it('is discoverable via getConnectorSpec', () => {
    const spec = getConnectorSpec('.mongodb');
    expect(spec).toBe(MongoDBConnector);
  });

  it('all actions are isTool:true', () => {
    expect(MongoDBConnector.actions.find.isTool).toBe(true);
    expect(MongoDBConnector.actions.aggregate.isTool).toBe(true);
    expect(MongoDBConnector.actions.count.isTool).toBe(true);
    expect(MongoDBConnector.actions.listCollections.isTool).toBe(true);
  });

  it('uses mongodb_connection_string auth', () => {
    expect(MongoDBConnector.auth?.types).toEqual(['mongodb_connection_string']);
  });

  it('supports workflows and agentBuilder', () => {
    expect(MongoDBConnector.metadata.supportedFeatureIds).toContain('workflows');
    expect(MongoDBConnector.metadata.supportedFeatureIds).toContain('agentBuilder');
  });

  it('is enterprise and tech preview', () => {
    expect(MongoDBConnector.metadata.minimumLicense).toBe('enterprise');
    expect(MongoDBConnector.metadata.isTechnicalPreview).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

describe('MongoDBConnector schema', () => {
  it('only contains database in config schema (connectionString is in auth secrets)', () => {
    const { schema } = MongoDBConnector;
    expect(schema).toBeDefined();
    if (!schema) return;
    const result = schema.parse({ database: 'mydb' });
    expect(result.database).toBe('mydb');
    // connectionString is NOT in the config schema — it lives in auth secrets
    expect(Object.keys(result)).toEqual(['database']);
  });

  it('rejects missing database', () => {
    const { schema } = MongoDBConnector;
    expect(schema).toBeDefined();
    if (!schema) return;
    expect(() => schema.parse({})).toThrow();
  });
});

// ---------------------------------------------------------------------------
// listCollections
// ---------------------------------------------------------------------------

describe('listCollections', () => {
  it('returns all collections when no nameFilter', async () => {
    mockListCollectionsToArray.mockResolvedValue([
      { name: 'orders', type: 'collection' },
      { name: 'users', type: 'collection' },
    ]);

    const result = await MongoDBConnector.actions.listCollections.handler(mockContext, {});
    expect(result).toEqual({
      database: 'test_db',
      count: 2,
      collections: [
        { name: 'orders', type: 'collection' },
        { name: 'users', type: 'collection' },
      ],
    });
    expect(mockListCollections).toHaveBeenCalledWith({});
    expect(mockConnect).toHaveBeenCalledTimes(1);
    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it('passes nameFilter to the server as a regex filter', async () => {
    // Mock returns only the server-filtered results (as MongoDB would)
    mockListCollectionsToArray.mockResolvedValue([
      { name: 'orders', type: 'collection' },
      { name: 'order_archive', type: 'collection' },
    ]);

    const result = await MongoDBConnector.actions.listCollections.handler(mockContext, {
      nameFilter: 'order',
    });
    expect(mockListCollections).toHaveBeenCalledWith({ name: { $regex: 'order' } });
    expect(result.count).toBe(2);
    expect(result.collections.map((c: { name: string }) => c.name)).toEqual([
      'orders',
      'order_archive',
    ]);
  });

  it('closes the client even if the operation throws', async () => {
    mockListCollectionsToArray.mockRejectedValue(new Error('network error'));

    await expect(MongoDBConnector.actions.listCollections.handler(mockContext, {})).rejects.toThrow(
      'network error'
    );
    expect(mockClose).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// find
// ---------------------------------------------------------------------------

describe('find', () => {
  it('calls find with filter, projection, sort, limit, and skip', async () => {
    const docs = [{ _id: '1', name: 'Alice' }];
    mockFindToArray.mockResolvedValue(docs);

    const collectionInstance = {
      find: jest.fn().mockReturnValue({ toArray: mockFindToArray }),
      aggregate: jest.fn(),
      countDocuments: mockCountDocuments,
    };
    mockCollection.mockReturnValue(collectionInstance);

    const result = await MongoDBConnector.actions.find.handler(mockContext, {
      collection: 'users',
      filter: { status: 'active' },
      projection: { name: 1, _id: 0 },
      sort: { name: 1 },
      limit: 10,
      skip: 5,
    });

    expect(mockCollection).toHaveBeenCalledWith('users');
    expect(collectionInstance.find).toHaveBeenCalledWith(
      { status: 'active' },
      { projection: { name: 1, _id: 0 }, sort: { name: 1 }, limit: 10, skip: 5 }
    );
    expect(result).toEqual({ count: 1, documents: docs });
  });

  it('defaults to empty filter and limit 100 when omitted', async () => {
    mockFindToArray.mockResolvedValue([]);
    const collectionInstance = {
      find: jest.fn().mockReturnValue({ toArray: mockFindToArray }),
      aggregate: jest.fn(),
      countDocuments: mockCountDocuments,
    };
    mockCollection.mockReturnValue(collectionInstance);

    await MongoDBConnector.actions.find.handler(mockContext, { collection: 'orders' });

    expect(collectionInstance.find).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ limit: 100 })
    );
  });

  it('closes the client even if find throws', async () => {
    mockFindToArray.mockRejectedValue(new Error('cursor error'));
    await expect(
      MongoDBConnector.actions.find.handler(mockContext, { collection: 'orders' })
    ).rejects.toThrow('cursor error');
    expect(mockClose).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// aggregate
// ---------------------------------------------------------------------------

describe('aggregate', () => {
  it('runs a valid read-only pipeline and appends $limit', async () => {
    const results = [{ _id: 'US', count: 42 }];
    mockAggregateToArray.mockResolvedValue(results);

    const collectionInstance = {
      find: jest.fn(),
      aggregate: jest.fn().mockReturnValue({ toArray: mockAggregateToArray }),
      countDocuments: mockCountDocuments,
    };
    mockCollection.mockReturnValue(collectionInstance);

    const result = await MongoDBConnector.actions.aggregate.handler(mockContext, {
      collection: 'orders',
      pipeline: [{ $group: { _id: '$region', count: { $sum: 1 } } }],
    });

    expect(result).toEqual({ count: 1, results });
    // A $limit stage should have been appended (default 100)
    expect(collectionInstance.aggregate).toHaveBeenCalledWith([
      { $group: { _id: '$region', count: { $sum: 1 } } },
      { $limit: 100 },
    ]);
  });

  it('preserves an existing $limit stage when it is within the cap', async () => {
    mockAggregateToArray.mockResolvedValue([]);
    const collectionInstance = {
      find: jest.fn(),
      aggregate: jest.fn().mockReturnValue({ toArray: mockAggregateToArray }),
      countDocuments: mockCountDocuments,
    };
    mockCollection.mockReturnValue(collectionInstance);

    await MongoDBConnector.actions.aggregate.handler(mockContext, {
      collection: 'orders',
      pipeline: [{ $match: { status: 'open' } }, { $limit: 5 }],
    });

    expect(collectionInstance.aggregate).toHaveBeenCalledWith([
      { $match: { status: 'open' } },
      { $limit: 5 },
    ]);
  });

  it('replaces an existing $limit stage that exceeds the cap', async () => {
    mockAggregateToArray.mockResolvedValue([]);
    const collectionInstance = {
      find: jest.fn(),
      aggregate: jest.fn().mockReturnValue({ toArray: mockAggregateToArray }),
      countDocuments: mockCountDocuments,
    };
    mockCollection.mockReturnValue(collectionInstance);

    await MongoDBConnector.actions.aggregate.handler(mockContext, {
      collection: 'orders',
      pipeline: [{ $match: {} }, { $limit: 9999 }],
      limit: 50,
    });

    // The oversized $limit should be replaced by the action-level limit
    expect(collectionInstance.aggregate).toHaveBeenCalledWith([{ $match: {} }, { $limit: 50 }]);
  });

  it.each(['$out', '$merge', '$function', '$accumulator'])(
    'rejects pipeline containing %s at the top level',
    async (stage) => {
      await expect(
        MongoDBConnector.actions.aggregate.handler(mockContext, {
          collection: 'orders',
          pipeline: [{ $match: {} }, { [stage]: {} }],
        })
      ).rejects.toThrow(`"${stage}" is not allowed`);
    }
  );

  it('rejects disallowed stages nested inside $facet sub-pipelines', async () => {
    await expect(
      MongoDBConnector.actions.aggregate.handler(mockContext, {
        collection: 'orders',
        pipeline: [{ $facet: { branch: [{ $out: 'target' }] } }],
      })
    ).rejects.toThrow('"$out" is not allowed');
  });

  it('rejects disallowed stages nested inside $lookup sub-pipelines', async () => {
    await expect(
      MongoDBConnector.actions.aggregate.handler(mockContext, {
        collection: 'orders',
        pipeline: [
          { $lookup: { from: 'other', let: {}, pipeline: [{ $merge: 'target' }], as: 'r' } },
        ],
      })
    ).rejects.toThrow('"$merge" is not allowed');
  });
});

// ---------------------------------------------------------------------------
// count
// ---------------------------------------------------------------------------

describe('count', () => {
  it('returns document count with filter', async () => {
    mockCountDocuments.mockResolvedValue(42);

    const collectionInstance = {
      find: jest.fn(),
      aggregate: jest.fn(),
      countDocuments: mockCountDocuments,
    };
    mockCollection.mockReturnValue(collectionInstance);

    const result = await MongoDBConnector.actions.count.handler(mockContext, {
      collection: 'orders',
      filter: { status: 'active' },
    });

    expect(mockCollection).toHaveBeenCalledWith('orders');
    expect(mockCountDocuments).toHaveBeenCalledWith({ status: 'active' });
    expect(result).toEqual({ count: 42 });
  });

  it('counts all documents when filter omitted', async () => {
    mockCountDocuments.mockResolvedValue(1000);
    const collectionInstance = {
      find: jest.fn(),
      aggregate: jest.fn(),
      countDocuments: mockCountDocuments,
    };
    mockCollection.mockReturnValue(collectionInstance);

    await MongoDBConnector.actions.count.handler(mockContext, { collection: 'orders' });
    expect(mockCountDocuments).toHaveBeenCalledWith({});
  });
});

// ---------------------------------------------------------------------------
// test handler
// ---------------------------------------------------------------------------

describe('test handler', () => {
  const { test: testHandler } = MongoDBConnector;

  it('returns ok:true on successful ping', async () => {
    mockCommand.mockResolvedValue({ ok: 1 });

    expect(testHandler).toBeDefined();
    if (!testHandler) return;
    const result = await testHandler.handler(mockContext);
    expect(result.ok).toBe(true);
    expect(result.message).toContain('Connected');
  });

  it('returns ok:false with message on connection failure', async () => {
    mockConnect.mockRejectedValue(new Error('Authentication failed'));

    expect(testHandler).toBeDefined();
    if (!testHandler) return;
    const result = await testHandler.handler(mockContext);
    expect(result.ok).toBe(false);
    expect(result.message).toContain('Authentication failed');
  });

  it('closes the client even when ping fails after connect', async () => {
    mockConnect.mockResolvedValue(undefined);
    mockCommand.mockRejectedValue(new Error('ping error'));

    expect(testHandler).toBeDefined();
    if (!testHandler) return;
    await testHandler.handler(mockContext);
    expect(mockClose).toHaveBeenCalledTimes(1);
  });
});
