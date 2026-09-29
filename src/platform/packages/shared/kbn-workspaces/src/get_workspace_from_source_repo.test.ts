/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';
import type { MockedFunction } from 'vitest';

import { ToolingLog } from '@kbn/tooling-log';
import { getWorkspaceFromSourceRepo } from './get_workspace_from_source_repo';
import { ensureClonedRepo } from './ensure_cloned_repo';

vi.mock('./ensure_cloned_repo');
vi.mock('./workspace_controller', () => {
      const mocked = {
      WorkspaceController: vi.fn().mockImplementation(() => ({
        fromSourceRepo: vi.fn().mockResolvedValue({ getDir: () => '/path/to/repo' }),
      })),
    };
      return { ...mocked, default: mocked };
    });

const mockEnsureClonedRepo = ensureClonedRepo as MockedFunction<typeof ensureClonedRepo>;

describe('getWorkspaceFromSourceRepo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not create the base clone', async () => {
    const log = new ToolingLog({
      level: 'silent',
      writeTo: {
        write: () => {},
      },
    });

    await getWorkspaceFromSourceRepo({ log, settings: { repoRoot: '/path/to/repo' } });

    expect(mockEnsureClonedRepo).not.toHaveBeenCalled();
  });
});
