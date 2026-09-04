/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ToolingLog } from '@kbn/tooling-log';
import { getWorkspaceFromSourceRepo } from './get_workspace_from_source_repo';
import { ensureClonedRepo } from './ensure_cloned_repo';

jest.mock('./ensure_cloned_repo');
jest.mock('./workspace_controller', () => ({
  WorkspaceController: jest.fn().mockImplementation(() => ({
    fromSourceRepo: jest.fn().mockResolvedValue({ getDir: () => '/path/to/repo' }),
  })),
}));

const mockEnsureClonedRepo = ensureClonedRepo as jest.MockedFunction<typeof ensureClonedRepo>;

describe('getWorkspaceFromSourceRepo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
