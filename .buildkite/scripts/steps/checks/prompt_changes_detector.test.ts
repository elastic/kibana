/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { upsertComment } from '#pipeline-utils';

// Mock the pipeline utils for testing
jest.mock('#pipeline-utils', () => ({
  upsertComment: jest.fn(),
}));

const mockUpsertComment = upsertComment as jest.MockedFunction<typeof upsertComment>;

describe('Prompt Changes Detector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should post comment when called', async () => {
    mockUpsertComment.mockResolvedValue({});

    // Import and run the main function
    const { main } = await import('./prompt_changes_detector');
    await main();

    expect(mockUpsertComment).toHaveBeenCalledWith({
      commentBody: expect.stringContaining('Prompt Changes Detected'),
      commentContext: 'prompt-changes-reminder',
      clearPrevious: true,
    });
  });

  it('should handle errors gracefully', async () => {
    // Mock an error
    mockUpsertComment.mockRejectedValue(new Error('Test error'));

    // Import and run the main function
    const { main } = await import('./prompt_changes_detector');

    // Should not throw, but should exit with code 1
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    const processSpy = jest.spyOn(process, 'exit').mockImplementation();

    await main();

    expect(consoleSpy).toHaveBeenCalledWith(
      '❌ Error posting prompt changes comment:',
      expect.any(Error)
    );
    expect(processSpy).toHaveBeenCalledWith(1);

    consoleSpy.mockRestore();
    processSpy.mockRestore();
  });
});
