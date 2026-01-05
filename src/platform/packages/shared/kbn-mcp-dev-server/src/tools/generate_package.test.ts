/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { generateKibanaPackageTool } from './generate_package';
import execa from 'execa';
import { extractToolResultTextContent } from './test_utils';

jest.mock('execa');
jest.mock('@kbn/repo-info', () => ({ REPO_ROOT: '/repo/root' }));

const mockedExeca = execa as jest.Mocked<typeof execa>;

describe('generateKibanaPackageTool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('executes the generate script and returns stdout', async () => {
    mockedExeca.command.mockResolvedValue({ stdout: 'package created' } as any);

    const result = await generateKibanaPackageTool.handler({
      name: '@kbn/some-pkg',
      owner: 'kibana-foo',
      group: 'workplaceai',
    });

    expect(extractToolResultTextContent(result)).toBe('package created');
    expect(mockedExeca.command).toHaveBeenCalledTimes(1);

    const command = mockedExeca.command.mock.calls[0][0];

    expect(mockedExeca.command).toHaveBeenCalledWith(
      expect.stringContaining('scripts/generate.js package @kbn/some-pkg'),
      expect.objectContaining({ cwd: '/repo/root' })
    );

    expect(command).toContain('--owner kibana-foo');
    expect(command).toContain('--group workplaceai');
  });
});
