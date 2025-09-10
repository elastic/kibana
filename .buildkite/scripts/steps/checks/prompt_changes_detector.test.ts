/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { doAnyChangesMatch } from '#pipeline-utils';

// Mock the pipeline utils for testing
jest.mock('#pipeline-utils', () => ({
  doAnyChangesMatch: jest.fn(),
  upsertComment: jest.fn(),
}));

const mockDoAnyChangesMatch = doAnyChangesMatch as jest.MockedFunction<typeof doAnyChangesMatch>;
const mockUpsertComment = require('#pipeline-utils').upsertComment as jest.MockedFunction<any>;

describe('Prompt Changes Detector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should detect changes to prompt files', async () => {
    // Mock that changes are detected
    mockDoAnyChangesMatch.mockResolvedValue(true);
    mockUpsertComment.mockResolvedValue({});

    // Import and run the main function
    const { main } = await import('./prompt_changes_detector');
    await main();

    expect(mockDoAnyChangesMatch).toHaveBeenCalledWith([
      /^x-pack\/solutions\/security\/plugins\/elastic_assistant\/server\/lib\/prompt\/local_prompt_object\.ts$/,
      /^x-pack\/solutions\/security\/plugins\/elastic_assistant\/server\/lib\/prompt\/tool_prompts\.ts$/,
      /^x-pack\/solutions\/security\/plugins\/elastic_assistant\/server\/lib\/prompt\/defend_insight_prompts\.ts$/,
      /^x-pack\/solutions\/security\/plugins\/elastic_assistant\/server\/lib\/prompt\/prompts\.ts$/,
    ]);

    expect(mockUpsertComment).toHaveBeenCalledWith({
      commentBody: expect.stringContaining('Prompt Changes Detected'),
      commentContext: 'prompt-changes-reminder',
      clearPrevious: true,
    });
  });

  it('should not post comment when no changes detected', async () => {
    // Mock that no changes are detected
    mockDoAnyChangesMatch.mockResolvedValue(false);

    // Import and run the main function
    const { main } = await import('./prompt_changes_detector');
    await main();

    expect(mockDoAnyChangesMatch).toHaveBeenCalled();
    expect(mockUpsertComment).not.toHaveBeenCalled();
  });

  it('should handle errors gracefully', async () => {
    // Mock an error
    mockDoAnyChangesMatch.mockRejectedValue(new Error('Test error'));

    // Import and run the main function
    const { main } = await import('./prompt_changes_detector');

    // Should not throw, but should exit with code 1
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    const processSpy = jest.spyOn(process, 'exit').mockImplementation();

    await main();

    expect(consoleSpy).toHaveBeenCalledWith(
      '❌ Error checking for prompt changes:',
      expect.any(Error)
    );
    expect(processSpy).toHaveBeenCalledWith(1);

    consoleSpy.mockRestore();
    processSpy.mockRestore();
  });
});
