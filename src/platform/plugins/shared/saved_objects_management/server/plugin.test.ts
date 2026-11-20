/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { registerRoutesMock } from './plugin.test.mocks';
import { SavedObjectsManagementPlugin } from './plugin';
import { Readable } from 'stream';
import { coreMock, httpServerMock } from '@kbn/core/server/mocks';
import { z } from '@kbn/zod';
import type { ApiBodyEntry } from './types';

const createEntry = (): ApiBodyEntry<{ title: string }, { title: string }> => ({
  getSchema: () => z.object({ title: z.string() }),
  toApi: ({ attributes }) => ({ body: { title: attributes.title }, warnings: [] }),
  toStored: ({ title }) => ({ attributes: { title }, references: [] }),
});

describe('SavedObjectsManagementPlugin', () => {
  let plugin: SavedObjectsManagementPlugin;

  beforeEach(() => {
    plugin = new SavedObjectsManagementPlugin(coreMock.createPluginInitializerContext());
  });

  describe('#setup', () => {
    it('registers the routes', async () => {
      const coreSetup = coreMock.createSetup();

      await plugin.setup(coreSetup);

      expect(registerRoutesMock).toHaveBeenCalledTimes(1);
      expect(registerRoutesMock).toHaveBeenCalledWith(
        expect.objectContaining({
          http: coreSetup.http,
        })
      );
    });
  });

  describe('API body registry', () => {
    it('returns the entry a plugin registered for a type', async () => {
      const entry = createEntry();
      const { registerApiBodyEntry } = await plugin.setup(coreMock.createSetup());
      registerApiBodyEntry('my-type', entry);

      const { getApiBodyEntry } = plugin.start(coreMock.createStart());

      expect(getApiBodyEntry('my-type')).toBe(entry);
    });

    it('returns nothing for a type no plugin registered', async () => {
      await plugin.setup(coreMock.createSetup());

      const { getApiBodyEntry } = plugin.start(coreMock.createStart());

      expect(getApiBodyEntry('unregistered-type')).toBeUndefined();
    });

    it('throws when a type is registered twice', async () => {
      const { registerApiBodyEntry } = await plugin.setup(coreMock.createSetup());
      registerApiBodyEntry('my-type', createEntry());

      expect(() => registerApiBodyEntry('my-type', createEntry())).toThrow(
        'An API body entry is already registered for saved object type [my-type]'
      );
    });
  });

  describe('#exportReferencedObjects', () => {
    it('fails when the roots and the objects they reach go over maxImportExportSize', async () => {
      const context = coreMock.createPluginInitializerContext();
      const globalConfig = context.config.legacy.get();
      context.config.legacy.get = () => ({
        ...globalConfig,
        savedObjects: { ...globalConfig.savedObjects, maxImportExportSize: 2 },
      });
      plugin = new SavedObjectsManagementPlugin(context);
      await plugin.setup(coreMock.createSetup());
      const coreStart = coreMock.createStart();
      const exporter = coreStart.savedObjects.createExporter(
        coreStart.savedObjects.getScopedClient(httpServerMock.createKibanaRequest())
      );
      jest.mocked(exporter.exportByObjects).mockResolvedValue(
        Readable.from([
          { type: 'dashboard', id: 'sales', attributes: {}, references: [] },
          { type: 'index-pattern', id: 'logs', attributes: {}, references: [] },
          { type: 'tag', id: 'team', attributes: {}, references: [] },
          { exportedCount: 3, missingRefCount: 0, missingReferences: [] },
        ])
      );

      const { exportReferencedObjects } = plugin.start(coreStart);

      await expect(
        exportReferencedObjects({
          request: httpServerMock.createKibanaRequest(),
          client: coreStart.savedObjects.getScopedClient(httpServerMock.createKibanaRequest()),
          roots: [{ type: 'dashboard', id: 'sales' }],
        })
      ).rejects.toThrow(
        expect.objectContaining({
          type: 'export-size-exceeded',
          message: expect.stringContaining("Can't export more than 2 objects."),
        })
      );
    });
  });
});
