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
// Mock the pooled client (ctx.getClient) — client construction/lifecycle now
// lives in lib/clients/mongodb_client_type.ts and is tested there.
// ---------------------------------------------------------------------------

const mockCountDocuments = jest.fn();
const mockFindToArray = jest.fn();
const mockAggregateToArray = jest.fn();
const mockListCollections = jest.fn();
const mockListCollectionsToArray = jest.fn();
const mockCommand = jest.fn();
const mockDb = jest.fn();
const mockCollection = jest.fn();
const mockInsertOne = jest.fn();
const mockUpdateOne = jest.fn();
const mockDeleteOne = jest.fn();
const mockGetClient = jest.fn();

// ---------------------------------------------------------------------------
// Test context
// ---------------------------------------------------------------------------

const mockContext = {
  client: {} as ActionContext['client'], // unused — connector uses the mongodb client type
  getClient: mockGetClient,
  config: { uri: 'mongodb://localhost:27017/test_db' },
  log: { debug: jest.fn(), error: jest.fn(), warn: jest.fn() },
} as unknown as ActionContext;

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();

  mockCommand.mockResolvedValue({ ok: 1 });
  mockGetClient.mockResolvedValue({ db: mockDb });

  // db() returns an object with collection(), listCollections(), and command()
  mockListCollections.mockReturnValue({ toArray: mockListCollectionsToArray });
  mockDb.mockReturnValue({
    collection: mockCollection,
    listCollections: mockListCollections,
    command: mockCommand,
  });

  // collection() returns an object with find/aggregate/countDocuments/insertOne/updateOne/deleteOne
  mockCollection.mockReturnValue({
    find: jest.fn().mockReturnValue({ toArray: mockFindToArray }),
    aggregate: jest.fn().mockReturnValue({ toArray: mockAggregateToArray }),
    countDocuments: mockCountDocuments,
    insertOne: mockInsertOne,
    updateOne: mockUpdateOne,
    deleteOne: mockDeleteOne,
  });

  mockFindToArray.mockResolvedValue([]);
  mockAggregateToArray.mockResolvedValue([]);
  mockCountDocuments.mockResolvedValue(0);
  mockListCollectionsToArray.mockResolvedValue([]);
  mockInsertOne.mockResolvedValue({ insertedId: 'abc123', acknowledged: true });
  mockUpdateOne.mockResolvedValue({
    matchedCount: 1,
    modifiedCount: 1,
    upsertedId: null,
    acknowledged: true,
  });
  mockDeleteOne.mockResolvedValue({ deletedCount: 1, acknowledged: true });
});

// ---------------------------------------------------------------------------
// Metadata and wiring
// ---------------------------------------------------------------------------

describe('MongoDBConnector metadata and wiring', () => {
  it('is discoverable via getConnectorSpec', () => {
    const spec = getConnectorSpec('.mongodb');
    expect(spec).toBe(MongoDBConnector);
  });

  it('read/discovery actions are isTool:true', () => {
    expect(MongoDBConnector.actions.find.isTool).toBe(true);
    expect(MongoDBConnector.actions.aggregate.isTool).toBe(true);
    expect(MongoDBConnector.actions.count.isTool).toBe(true);
    expect(MongoDBConnector.actions.listCollections.isTool).toBe(true);
  });

  it('write actions are isTool:false (workflow-only, not exposed to agents)', () => {
    expect(MongoDBConnector.actions.insertOne.isTool).toBe(false);
    expect(MongoDBConnector.actions.updateOne.isTool).toBe(false);
    expect(MongoDBConnector.actions.deleteOne.isTool).toBe(false);
  });

  it('uses basic auth', () => {
    expect(MongoDBConnector.auth?.types).toEqual(['basic']);
  });

  it('supports agentBuilder only (workflows follows in a later PR)', () => {
    expect(MongoDBConnector.metadata.supportedFeatureIds).toEqual(['agentBuilder']);
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
  it('only contains uri in config schema (credentials are in basic auth secrets)', () => {
    const { schema } = MongoDBConnector;
    expect(schema).toBeDefined();
    if (!schema) return;
    const result = schema.parse({ uri: 'mongodb://localhost:27017/mydb' });
    expect(result.uri).toBe('mongodb://localhost:27017/mydb');
    // username/password are NOT in the config schema — they live in basic auth secrets
    expect(Object.keys(result)).toEqual(['uri']);
  });

  it('rejects missing uri', () => {
    const { schema } = MongoDBConnector;
    expect(schema).toBeDefined();
    if (!schema) return;
    expect(() => schema.parse({})).toThrow();
  });
});

// ---------------------------------------------------------------------------
// Database resolution
// ---------------------------------------------------------------------------

describe('database resolution', () => {
  it('uses the database from the URI path when action input omits it', async () => {
    await MongoDBConnector.actions.count.handler(mockContext, { collection: 'orders' });
    expect(mockDb).toHaveBeenCalledWith('test_db');
  });

  it('uses the database from action input when provided, overriding the URI path', async () => {
    await MongoDBConnector.actions.count.handler(mockContext, {
      collection: 'orders',
      database: 'other_db',
    });
    expect(mockDb).toHaveBeenCalledWith('other_db');
  });

  it('throws when neither action input nor the URI path provides a database', async () => {
    const ctxWithoutDbPath = {
      ...mockContext,
      config: { uri: 'mongodb://localhost:27017' },
    } as unknown as ActionContext;

    await expect(
      MongoDBConnector.actions.count.handler(ctxWithoutDbPath, { collection: 'orders' })
    ).rejects.toThrow('database name is required');
  });

  it('surfaces the real parse error for a malformed URI instead of "database name is required"', async () => {
    const ctxWithMalformedUri = {
      ...mockContext,
      config: { uri: 'not-a-valid-uri' },
    } as unknown as ActionContext;

    await expect(
      MongoDBConnector.actions.count.handler(ctxWithMalformedUri, { collection: 'orders' })
    ).rejects.toThrow(/invalid scheme|invalid connection string/i);
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
    expect(mockGetClient).toHaveBeenCalledWith('mongodb');
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

  it('escapes regex metacharacters in nameFilter so it matches as a literal substring', async () => {
    mockListCollectionsToArray.mockResolvedValue([]);

    await MongoDBConnector.actions.listCollections.handler(mockContext, {
      nameFilter: 'my.log',
    });
    expect(mockListCollections).toHaveBeenCalledWith({ name: { $regex: 'my\\.log' } });
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
      insertOne: mockInsertOne,
      updateOne: mockUpdateOne,
      deleteOne: mockDeleteOne,
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
      insertOne: mockInsertOne,
      updateOne: mockUpdateOne,
      deleteOne: mockDeleteOne,
    };
    mockCollection.mockReturnValue(collectionInstance);

    await MongoDBConnector.actions.find.handler(mockContext, { collection: 'orders' });

    expect(collectionInstance.find).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ limit: 100 })
    );
  });

  it('rejects $where in the filter', async () => {
    await expect(
      MongoDBConnector.actions.find.handler(mockContext, {
        collection: 'orders',
        filter: { $where: 'sleep(10000) || true' },
      })
    ).rejects.toThrow('"$where" is not allowed');
  });

  it('rejects $function nested inside $expr in the filter', async () => {
    await expect(
      MongoDBConnector.actions.find.handler(mockContext, {
        collection: 'orders',
        filter: {
          $expr: { $function: { body: 'function(){ return true; }', args: [], lang: 'js' } },
        },
      })
    ).rejects.toThrow('"$function" is not allowed');
  });

  it('rejects $function nested inside the projection', async () => {
    await expect(
      MongoDBConnector.actions.find.handler(mockContext, {
        collection: 'orders',
        projection: { computed: { $function: { body: 'function(){}', args: [], lang: 'js' } } },
      })
    ).rejects.toThrow('"$function" is not allowed');
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
      insertOne: mockInsertOne,
      updateOne: mockUpdateOne,
      deleteOne: mockDeleteOne,
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
      insertOne: mockInsertOne,
      updateOne: mockUpdateOne,
      deleteOne: mockDeleteOne,
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
      insertOne: mockInsertOne,
      updateOne: mockUpdateOne,
      deleteOne: mockDeleteOne,
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

  it('appends a $limit inside each $facet branch, not just the outer pipeline', async () => {
    mockAggregateToArray.mockResolvedValue([]);
    const collectionInstance = {
      find: jest.fn(),
      aggregate: jest.fn().mockReturnValue({ toArray: mockAggregateToArray }),
      countDocuments: mockCountDocuments,
      insertOne: mockInsertOne,
      updateOne: mockUpdateOne,
      deleteOne: mockDeleteOne,
    };
    mockCollection.mockReturnValue(collectionInstance);

    await MongoDBConnector.actions.aggregate.handler(mockContext, {
      collection: 'orders',
      pipeline: [{ $facet: { all: [{ $match: {} }] } }],
      limit: 10,
    });

    // Without per-branch clamping, $facet would return the whole matching set inside
    // one document, defeating the outer $limit (which only ever bounds it to 1 doc).
    expect(collectionInstance.aggregate).toHaveBeenCalledWith([
      { $facet: { all: [{ $match: {} }, { $limit: 10 }] } },
      { $limit: 10 },
    ]);
  });

  it('preserves an existing within-cap $limit inside a $facet branch', async () => {
    mockAggregateToArray.mockResolvedValue([]);
    const collectionInstance = {
      find: jest.fn(),
      aggregate: jest.fn().mockReturnValue({ toArray: mockAggregateToArray }),
      countDocuments: mockCountDocuments,
      insertOne: mockInsertOne,
      updateOne: mockUpdateOne,
      deleteOne: mockDeleteOne,
    };
    mockCollection.mockReturnValue(collectionInstance);

    await MongoDBConnector.actions.aggregate.handler(mockContext, {
      collection: 'orders',
      pipeline: [{ $facet: { all: [{ $match: {} }, { $limit: 5 }] } }],
    });

    expect(collectionInstance.aggregate).toHaveBeenCalledWith([
      { $facet: { all: [{ $match: {} }, { $limit: 5 }] } },
      { $limit: 100 },
    ]);
  });

  it('clamps every branch of a multi-branch $facet independently', async () => {
    mockAggregateToArray.mockResolvedValue([]);
    const collectionInstance = {
      find: jest.fn(),
      aggregate: jest.fn().mockReturnValue({ toArray: mockAggregateToArray }),
      countDocuments: mockCountDocuments,
      insertOne: mockInsertOne,
      updateOne: mockUpdateOne,
      deleteOne: mockDeleteOne,
    };
    mockCollection.mockReturnValue(collectionInstance);

    await MongoDBConnector.actions.aggregate.handler(mockContext, {
      collection: 'orders',
      pipeline: [
        {
          $facet: {
            all: [{ $match: {} }],
            oversized: [{ $match: {} }, { $limit: 9999 }],
          },
        },
      ],
      limit: 25,
    });

    expect(collectionInstance.aggregate).toHaveBeenCalledWith([
      {
        $facet: {
          all: [{ $match: {} }, { $limit: 25 }],
          oversized: [{ $match: {} }, { $limit: 25 }],
        },
      },
      { $limit: 25 },
    ]);
  });

  it('appends a $limit inside a $lookup sub-pipeline, not just the outer pipeline', async () => {
    mockAggregateToArray.mockResolvedValue([]);
    const collectionInstance = {
      find: jest.fn(),
      aggregate: jest.fn().mockReturnValue({ toArray: mockAggregateToArray }),
      countDocuments: mockCountDocuments,
      insertOne: mockInsertOne,
      updateOne: mockUpdateOne,
      deleteOne: mockDeleteOne,
    };
    mockCollection.mockReturnValue(collectionInstance);

    await MongoDBConnector.actions.aggregate.handler(mockContext, {
      collection: 'orders',
      pipeline: [{ $lookup: { from: 'other', pipeline: [{ $match: {} }], as: 'joined' } }],
      limit: 10,
    });

    // Without sub-pipeline clamping, the outer $limit only bounds the outer document count —
    // each joined document's "joined" array could still hold the entire matching set.
    expect(collectionInstance.aggregate).toHaveBeenCalledWith([
      { $lookup: { from: 'other', pipeline: [{ $match: {} }, { $limit: 10 }], as: 'joined' } },
      { $limit: 10 },
    ]);
  });

  it('preserves an existing within-cap $limit inside a $lookup sub-pipeline', async () => {
    mockAggregateToArray.mockResolvedValue([]);
    const collectionInstance = {
      find: jest.fn(),
      aggregate: jest.fn().mockReturnValue({ toArray: mockAggregateToArray }),
      countDocuments: mockCountDocuments,
      insertOne: mockInsertOne,
      updateOne: mockUpdateOne,
      deleteOne: mockDeleteOne,
    };
    mockCollection.mockReturnValue(collectionInstance);

    await MongoDBConnector.actions.aggregate.handler(mockContext, {
      collection: 'orders',
      pipeline: [
        { $lookup: { from: 'other', pipeline: [{ $match: {} }, { $limit: 5 }], as: 'joined' } },
      ],
    });

    expect(collectionInstance.aggregate).toHaveBeenCalledWith([
      { $lookup: { from: 'other', pipeline: [{ $match: {} }, { $limit: 5 }], as: 'joined' } },
      { $limit: 100 },
    ]);
  });

  it('leaves a $lookup without its own pipeline (equality-match form) untouched', async () => {
    mockAggregateToArray.mockResolvedValue([]);
    const collectionInstance = {
      find: jest.fn(),
      aggregate: jest.fn().mockReturnValue({ toArray: mockAggregateToArray }),
      countDocuments: mockCountDocuments,
      insertOne: mockInsertOne,
      updateOne: mockUpdateOne,
      deleteOne: mockDeleteOne,
    };
    mockCollection.mockReturnValue(collectionInstance);

    await MongoDBConnector.actions.aggregate.handler(mockContext, {
      collection: 'orders',
      pipeline: [
        { $lookup: { from: 'other', localField: 'id', foreignField: 'id', as: 'joined' } },
      ],
    });

    expect(collectionInstance.aggregate).toHaveBeenCalledWith([
      { $lookup: { from: 'other', localField: 'id', foreignField: 'id', as: 'joined' } },
      { $limit: 100 },
    ]);
  });

  it('appends a $limit inside a $unionWith object-form sub-pipeline', async () => {
    mockAggregateToArray.mockResolvedValue([]);
    const collectionInstance = {
      find: jest.fn(),
      aggregate: jest.fn().mockReturnValue({ toArray: mockAggregateToArray }),
      countDocuments: mockCountDocuments,
      insertOne: mockInsertOne,
      updateOne: mockUpdateOne,
      deleteOne: mockDeleteOne,
    };
    mockCollection.mockReturnValue(collectionInstance);

    await MongoDBConnector.actions.aggregate.handler(mockContext, {
      collection: 'orders',
      pipeline: [{ $unionWith: { coll: 'other', pipeline: [{ $match: {} }] } }],
      limit: 10,
    });

    expect(collectionInstance.aggregate).toHaveBeenCalledWith([
      { $unionWith: { coll: 'other', pipeline: [{ $match: {} }, { $limit: 10 }] } },
      { $limit: 10 },
    ]);
  });

  it('leaves a bare-collection-name $unionWith untouched', async () => {
    mockAggregateToArray.mockResolvedValue([]);
    const collectionInstance = {
      find: jest.fn(),
      aggregate: jest.fn().mockReturnValue({ toArray: mockAggregateToArray }),
      countDocuments: mockCountDocuments,
      insertOne: mockInsertOne,
      updateOne: mockUpdateOne,
      deleteOne: mockDeleteOne,
    };
    mockCollection.mockReturnValue(collectionInstance);

    await MongoDBConnector.actions.aggregate.handler(mockContext, {
      collection: 'orders',
      pipeline: [{ $unionWith: 'other' }],
    });

    expect(collectionInstance.aggregate).toHaveBeenCalledWith([
      { $unionWith: 'other' },
      { $limit: 100 },
    ]);
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

  it('rejects $function nested inside a $project expression (not a top-level stage)', async () => {
    await expect(
      MongoDBConnector.actions.aggregate.handler(mockContext, {
        collection: 'orders',
        pipeline: [
          {
            $project: {
              x: { $function: { body: 'function(){ return 1; }', args: [], lang: 'js' } },
            },
          },
        ],
      })
    ).rejects.toThrow('"$function" is not allowed');
  });

  it('rejects $accumulator nested inside a $group expression', async () => {
    await expect(
      MongoDBConnector.actions.aggregate.handler(mockContext, {
        collection: 'orders',
        pipeline: [
          {
            $group: {
              _id: '$region',
              total: { $accumulator: { init: 'function(){}', accumulate: 'function(){}' } },
            },
          },
        ],
      })
    ).rejects.toThrow('"$accumulator" is not allowed');
  });

  it('rejects $where nested inside a $match expression', async () => {
    await expect(
      MongoDBConnector.actions.aggregate.handler(mockContext, {
        collection: 'orders',
        pipeline: [{ $match: { $where: 'sleep(10000) || true' } }],
      })
    ).rejects.toThrow('"$where" is not allowed');
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
      insertOne: mockInsertOne,
      updateOne: mockUpdateOne,
      deleteOne: mockDeleteOne,
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
      insertOne: mockInsertOne,
      updateOne: mockUpdateOne,
      deleteOne: mockDeleteOne,
    };
    mockCollection.mockReturnValue(collectionInstance);

    await MongoDBConnector.actions.count.handler(mockContext, { collection: 'orders' });
    expect(mockCountDocuments).toHaveBeenCalledWith({});
  });

  it('rejects $where in the filter', async () => {
    await expect(
      MongoDBConnector.actions.count.handler(mockContext, {
        collection: 'orders',
        filter: { $where: 'sleep(10000) || true' },
      })
    ).rejects.toThrow('"$where" is not allowed');
  });
});

// ---------------------------------------------------------------------------
// insertOne
// ---------------------------------------------------------------------------

describe('insertOne', () => {
  it('inserts a document and returns the inserted id', async () => {
    mockInsertOne.mockResolvedValue({ insertedId: 'abc123', acknowledged: true });

    const result = await MongoDBConnector.actions.insertOne.handler(mockContext, {
      collection: 'orders',
      document: { status: 'pending' },
    });

    expect(mockCollection).toHaveBeenCalledWith('orders');
    expect(mockInsertOne).toHaveBeenCalledWith({ status: 'pending' });
    expect(result).toEqual({ insertedId: 'abc123', acknowledged: true });
  });
});

// ---------------------------------------------------------------------------
// updateOne
// ---------------------------------------------------------------------------

describe('updateOne', () => {
  it('updates a document matching the filter', async () => {
    mockUpdateOne.mockResolvedValue({
      matchedCount: 1,
      modifiedCount: 1,
      upsertedId: null,
      acknowledged: true,
    });

    const result = await MongoDBConnector.actions.updateOne.handler(mockContext, {
      collection: 'orders',
      filter: { _id: 'abc' },
      update: { $set: { status: 'shipped' } },
    });

    expect(mockUpdateOne).toHaveBeenCalledWith(
      { _id: 'abc' },
      { $set: { status: 'shipped' } },
      { upsert: false }
    );
    expect(result).toEqual({
      matchedCount: 1,
      modifiedCount: 1,
      upsertedId: null,
      acknowledged: true,
    });
  });

  it('passes upsert through when set', async () => {
    mockUpdateOne.mockResolvedValue({
      matchedCount: 0,
      modifiedCount: 0,
      upsertedId: 'new-id',
      acknowledged: true,
    });

    const result = await MongoDBConnector.actions.updateOne.handler(mockContext, {
      collection: 'orders',
      filter: { _id: 'abc' },
      update: { $set: { status: 'shipped' } },
      upsert: true,
    });

    expect(mockUpdateOne).toHaveBeenCalledWith(
      { _id: 'abc' },
      { $set: { status: 'shipped' } },
      { upsert: true }
    );
    expect(result.upsertedId).toBe('new-id');
  });
});

// ---------------------------------------------------------------------------
// deleteOne
// ---------------------------------------------------------------------------

describe('deleteOne', () => {
  it('deletes a document matching the filter', async () => {
    mockDeleteOne.mockResolvedValue({ deletedCount: 1, acknowledged: true });

    const result = await MongoDBConnector.actions.deleteOne.handler(mockContext, {
      collection: 'orders',
      filter: { _id: 'abc' },
    });

    expect(mockDeleteOne).toHaveBeenCalledWith({ _id: 'abc' });
    expect(result).toEqual({ deletedCount: 1, acknowledged: true });
  });
});

// ---------------------------------------------------------------------------
// test handler
// ---------------------------------------------------------------------------

describe('test handler', () => {
  const { test: testHandler } = MongoDBConnector;

  it('resolves on successful ping', async () => {
    mockCommand.mockResolvedValue({ ok: 1 });

    expect(testHandler).toBeDefined();
    if (!testHandler) return;
    await expect(testHandler.handler(mockContext)).resolves.toEqual({});
  });

  it('pings the admin database regardless of the configured URI path', async () => {
    expect(testHandler).toBeDefined();
    if (!testHandler) return;
    await testHandler.handler(mockContext);
    expect(mockDb).toHaveBeenCalledWith('admin');
  });

  it('propagates a ping failure', async () => {
    mockCommand.mockRejectedValue(new Error('ping error'));

    expect(testHandler).toBeDefined();
    if (!testHandler) return;
    await expect(testHandler.handler(mockContext)).rejects.toThrow('ping error');
  });
});
