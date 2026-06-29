/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { loggerMock } from '@kbn/logging-mocks';
import { MongoDBConnector } from './mongodb';
import type { ActionContext } from '../../connector_spec';

// Fake MongoDB client helpers — no real MongoClient or driver needed in unit tests.
const makeToArray = (docs: unknown[]) => jest.fn().mockResolvedValue(docs);
const makeCursor = (docs: unknown[]) => ({
  toArray: makeToArray(docs),
  limit: jest.fn().mockReturnThis(),
});

const makeCollection = (overrides: Record<string, jest.Mock> = {}) => ({
  find: jest.fn().mockReturnValue(makeCursor([{ _id: '1', name: 'Alice' }])),
  aggregate: jest.fn().mockReturnValue(makeCursor([{ _id: 'admin', count: 5 }])),
  insertOne: jest.fn().mockResolvedValue({ insertedId: 'new-id-123', acknowledged: true }),
  updateOne: jest
    .fn()
    .mockResolvedValue({ matchedCount: 1, modifiedCount: 1, upsertedId: null, acknowledged: true }),
  deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1, acknowledged: true }),
  ...overrides,
});

const makeDb = (collectionMock = makeCollection()) => ({
  collection: jest.fn().mockReturnValue(collectionMock),
  listCollections: jest.fn().mockReturnValue(
    makeCursor([
      { name: 'users', type: 'collection' },
      { name: 'orders', type: 'collection' },
    ])
  ),
  command: jest.fn().mockResolvedValue({ ok: 1 }),
});

const makeMongoClient = (dbMock = makeDb()) => ({
  db: jest.fn().mockReturnValue(dbMock),
});

const makeCtx = (overrides: Partial<ActionContext> = {}): ActionContext => ({
  client: {} as ActionContext['client'],
  config: { uri: 'mongodb://localhost:27017/mydb' },
  secrets: { authType: 'basic', username: 'user', password: 'pass' },
  log: loggerMock.create(),
  getClient: jest.fn().mockResolvedValue(makeMongoClient()),
  ...overrides,
});

describe('MongoDBConnector', () => {
  it('has the expected id and metadata', () => {
    expect(MongoDBConnector.metadata.id).toBe('.mongodb');
    expect(MongoDBConnector.metadata.minimumLicense).toBe('enterprise');
    expect(MongoDBConnector.metadata.supportedFeatureIds).toContain('agentBuilder');
  });

  describe('test handler', () => {
    it('pings the admin db and returns ok', async () => {
      const dbMock = makeDb();
      const ctx = makeCtx({ getClient: jest.fn().mockResolvedValue(makeMongoClient(dbMock)) });
      const result = await MongoDBConnector.test?.handler(ctx);
      expect(ctx.getClient).toHaveBeenCalledWith('mongodb');
      expect(dbMock.command).toHaveBeenCalledWith({ ping: 1 });
      expect(result?.ok).toBe(true);
    });
  });

  describe('find action', () => {
    it('is marked as a tool', () => {
      expect(MongoDBConnector.actions.find.isTool).toBe(true);
    });

    it('queries the collection and returns documents', async () => {
      const collectionMock = makeCollection();
      const dbMock = makeDb(collectionMock);
      const mongoClient = makeMongoClient(dbMock);
      const ctx = makeCtx({ getClient: jest.fn().mockResolvedValue(mongoClient) });

      const result = await MongoDBConnector.actions.find.handler(ctx, {
        collection: 'users',
        filter: { active: true },
        limit: 10,
      });

      expect(dbMock.collection).toHaveBeenCalledWith('users');
      expect(collectionMock.find).toHaveBeenCalledWith(
        { active: true },
        expect.objectContaining({ limit: 10 })
      );
      expect(result).toEqual({ documents: [{ _id: '1', name: 'Alice' }], count: 1 });
    });

    it('uses the action-level database when provided', async () => {
      const dbMock = makeDb();
      const mongoClient = makeMongoClient(dbMock);
      const ctx = makeCtx({ getClient: jest.fn().mockResolvedValue(mongoClient) });

      await MongoDBConnector.actions.find.handler(ctx, {
        collection: 'orders',
        database: 'shopdb',
      });

      expect(mongoClient.db).toHaveBeenCalledWith('shopdb');
    });

    it('uses the database from the URI path when action database is omitted', async () => {
      const dbMock = makeDb();
      const mongoClient = makeMongoClient(dbMock);
      const ctx = makeCtx({ getClient: jest.fn().mockResolvedValue(mongoClient) });

      await MongoDBConnector.actions.find.handler(ctx, { collection: 'users' });

      expect(mongoClient.db).toHaveBeenCalledWith('mydb');
    });

    it('throws when no database is resolvable', async () => {
      const ctx = makeCtx({
        config: { uri: 'mongodb://localhost:27017' },
        getClient: jest.fn().mockResolvedValue(makeMongoClient()),
      });

      await expect(
        MongoDBConnector.actions.find.handler(ctx, { collection: 'users' })
      ).rejects.toThrow('database name is required');
    });
  });

  describe('aggregate action', () => {
    it('is marked as a tool', () => {
      expect(MongoDBConnector.actions.aggregate.isTool).toBe(true);
    });

    it('runs the pipeline and returns documents', async () => {
      const collectionMock = makeCollection();
      const dbMock = makeDb(collectionMock);
      const ctx = makeCtx({ getClient: jest.fn().mockResolvedValue(makeMongoClient(dbMock)) });

      const pipeline = [
        { $match: { active: true } },
        { $group: { _id: '$role', count: { $sum: 1 } } },
      ];
      const result = await MongoDBConnector.actions.aggregate.handler(ctx, {
        collection: 'users',
        pipeline,
      });

      expect(collectionMock.aggregate).toHaveBeenCalledWith(pipeline);
      expect(result).toEqual({ documents: [{ _id: 'admin', count: 5 }], count: 1 });
    });

    it('applies limit when provided', async () => {
      const cursorMock = makeCursor([]);
      const collectionMock = makeCollection({ aggregate: jest.fn().mockReturnValue(cursorMock) });
      const ctx = makeCtx({
        getClient: jest.fn().mockResolvedValue(makeMongoClient(makeDb(collectionMock))),
      });

      await MongoDBConnector.actions.aggregate.handler(ctx, {
        collection: 'users',
        pipeline: [{ $match: {} }],
        limit: 5,
      });

      expect(cursorMock.limit).toHaveBeenCalledWith(5);
    });
  });

  describe('listCollections action', () => {
    it('is marked as a tool', () => {
      expect(MongoDBConnector.actions.listCollections.isTool).toBe(true);
    });

    it('returns collection names and types', async () => {
      const dbMock = makeDb();
      const ctx = makeCtx({ getClient: jest.fn().mockResolvedValue(makeMongoClient(dbMock)) });

      const result = await MongoDBConnector.actions.listCollections.handler(ctx, {});

      expect(result).toEqual({
        collections: [
          { name: 'users', type: 'collection' },
          { name: 'orders', type: 'collection' },
        ],
        count: 2,
      });
    });
  });

  describe('insertOne action', () => {
    it('is NOT marked as a tool', () => {
      expect(MongoDBConnector.actions.insertOne.isTool).toBeFalsy();
    });

    it('inserts a document and returns the insertedId', async () => {
      const collectionMock = makeCollection();
      const ctx = makeCtx({
        getClient: jest.fn().mockResolvedValue(makeMongoClient(makeDb(collectionMock))),
      });

      const result = await MongoDBConnector.actions.insertOne.handler(ctx, {
        collection: 'users',
        document: { name: 'Bob', age: 30 },
      });

      expect(collectionMock.insertOne).toHaveBeenCalledWith({ name: 'Bob', age: 30 });
      expect(result).toEqual({ insertedId: 'new-id-123', acknowledged: true });
    });
  });

  describe('updateOne action', () => {
    it('is NOT marked as a tool', () => {
      expect(MongoDBConnector.actions.updateOne.isTool).toBeFalsy();
    });

    it('updates a document and returns match/modify counts', async () => {
      const collectionMock = makeCollection();
      const ctx = makeCtx({
        getClient: jest.fn().mockResolvedValue(makeMongoClient(makeDb(collectionMock))),
      });

      const result = await MongoDBConnector.actions.updateOne.handler(ctx, {
        collection: 'users',
        filter: { _id: '1' },
        update: { $set: { active: false } },
      });

      expect(collectionMock.updateOne).toHaveBeenCalledWith(
        { _id: '1' },
        { $set: { active: false } },
        { upsert: false }
      );
      expect(result).toEqual({
        matchedCount: 1,
        modifiedCount: 1,
        upsertedId: null,
        acknowledged: true,
      });
    });
  });

  describe('deleteOne action', () => {
    it('is NOT marked as a tool', () => {
      expect(MongoDBConnector.actions.deleteOne.isTool).toBeFalsy();
    });

    it('deletes a document and returns the count', async () => {
      const collectionMock = makeCollection();
      const ctx = makeCtx({
        getClient: jest.fn().mockResolvedValue(makeMongoClient(makeDb(collectionMock))),
      });

      const result = await MongoDBConnector.actions.deleteOne.handler(ctx, {
        collection: 'users',
        filter: { _id: '1' },
      });

      expect(collectionMock.deleteOne).toHaveBeenCalledWith({ _id: '1' });
      expect(result).toEqual({ deletedCount: 1, acknowledged: true });
    });
  });
});
