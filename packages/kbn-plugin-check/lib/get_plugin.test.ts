/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ToolingLog } from '@kbn/tooling-log';

import { getPlugin } from './get_plugin';

jest.mock('@kbn/docs-utils', () => ({
  findPlugins: jest.fn(),
}));

const { findPlugins } = jest.requireMock('@kbn/docs-utils');

interface MockPlugin {
  id: string;
  manifest: { id: string; owner: { name: string }; serviceFolders: readonly string[] };
  isPlugin: boolean;
  directory: string;
  manifestPath: string;
}

const createMockPlugin = (id: string): MockPlugin => ({
  id,
  manifest: {
    id: `@kbn/${id}`,
    owner: { name: 'Test Owner' },
    serviceFolders: [],
  },
  isPlugin: true,
  directory: `/path/to/${id}`,
  manifestPath: `/path/to/${id}/kibana.jsonc`,
});

const createMockLog = (): jest.Mocked<ToolingLog> =>
  ({
    debug: jest.fn(),
    error: jest.fn(),
  } as unknown as jest.Mocked<ToolingLog>);

describe('getPlugin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the plugin when found', () => {
    const mockPlugin = createMockPlugin('testPlugin');
    findPlugins.mockReturnValue([mockPlugin]);
    const log = createMockLog();

    const result = getPlugin('testPlugin', log);

    expect(findPlugins).toHaveBeenCalledWith({ pluginFilter: ['testPlugin'] });
    expect(result).toEqual(mockPlugin);
    expect(log.debug).toHaveBeenCalledWith('Found plugin:', 'testPlugin');
    expect(log.error).not.toHaveBeenCalled();
  });

  it('returns null and logs error when plugin is not found', () => {
    findPlugins.mockReturnValue([]);
    const log = createMockLog();

    const result = getPlugin('nonExistentPlugin', log);

    expect(findPlugins).toHaveBeenCalledWith({ pluginFilter: ['nonExistentPlugin'] });
    expect(result).toBeNull();
    expect(log.error).toHaveBeenCalledWith('Plugin nonExistentPlugin not found');
    expect(log.debug).not.toHaveBeenCalled();
  });

  it('returns null when `findPlugins` returns plugins that do not match the requested id', () => {
    const mockPlugin = createMockPlugin('differentPlugin');
    findPlugins.mockReturnValue([mockPlugin]);
    const log = createMockLog();

    const result = getPlugin('testPlugin', log);

    expect(result).toBeNull();
    expect(log.error).toHaveBeenCalledWith('Plugin testPlugin not found');
  });

  it('finds the correct plugin when multiple plugins are returned', () => {
    const plugins = [
      createMockPlugin('pluginA'),
      createMockPlugin('targetPlugin'),
      createMockPlugin('pluginB'),
    ];
    findPlugins.mockReturnValue(plugins);
    const log = createMockLog();

    const result = getPlugin('targetPlugin', log);

    expect(result).toEqual(plugins[1]);
    expect(log.debug).toHaveBeenCalledWith('Found plugin:', 'targetPlugin');
  });
});
