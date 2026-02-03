/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import { Project } from 'ts-morph';
import { ToolingLog } from '@kbn/tooling-log';
import { getDeclarationNodesForPluginScope } from './get_declaration_nodes_for_plugin';
import { ApiScope } from './types';
import type { PluginOrPackage } from './types';

const log = new ToolingLog({
  level: 'silent',
  writeTo: process.stdout,
});

describe('getDeclarationNodesForPluginScope', () => {
  it('handles package scope mismatch', () => {
    const project = new Project({
      useInMemoryFileSystem: true,
    });

    const plugin: PluginOrPackage = {
      id: 'test-package',
      directory: Path.resolve(__dirname, '..'),
      isPlugin: false,
      scope: ApiScope.SERVER,
      manifestPath: Path.resolve(__dirname, '../package.json'),
      manifest: {
        id: 'test-package',
        owner: { name: '[Owner missing]' },
        serviceFolders: [],
      },
    };

    const nodes = getDeclarationNodesForPluginScope(project, plugin, ApiScope.CLIENT, log);

    expect(nodes).toEqual([]);
  });

  it('handles files that do not exist gracefully', () => {
    const project = new Project({
      useInMemoryFileSystem: true,
    });

    const plugin: PluginOrPackage = {
      id: 'test-plugin',
      directory: Path.resolve(__dirname, 'nonexistent'),
      isPlugin: true,
      manifestPath: Path.resolve(__dirname, 'nonexistent/kibana.json'),
      manifest: {
        id: 'test-plugin',
        pluginId: 'test-plugin',
        owner: { name: '[Owner missing]' },
        serviceFolders: [],
      },
    };

    const nodes = getDeclarationNodesForPluginScope(project, plugin, ApiScope.CLIENT, log);

    // Should return empty array when file doesn't exist
    expect(nodes).toEqual([]);
  });
});
