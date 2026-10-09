/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { copyToClipboard } from '@elastic/eui';
import { copyTextToClipboard } from './copy_text_to_clipboard';

jest.mock('@elastic/eui', () => ({
  copyToClipboard: jest.fn(),
}));

const mockCopyToClipboard = copyToClipboard as jest.MockedFunction<typeof copyToClipboard>;

describe('WHEN copying text to the clipboard', () => {
  const originalClipboard = window.navigator.clipboard;
  const writeText = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    mockCopyToClipboard.mockReturnValue(true);
    writeText.mockResolvedValue(undefined);
  });

  afterEach(() => {
    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: originalClipboard,
    });
  });

  it('SHOULD copy with the async Clipboard API first', async () => {
    await expect(copyTextToClipboard('response')).resolves.toBe(true);

    expect(writeText).toHaveBeenCalledWith('response');
    expect(mockCopyToClipboard).not.toHaveBeenCalled();
  });

  it('SHOULD fall back to the document copy helper when the Clipboard API write rejects', async () => {
    writeText.mockRejectedValue(new Error('Clipboard write failed'));

    await expect(copyTextToClipboard('response')).resolves.toBe(true);

    expect(mockCopyToClipboard).toHaveBeenCalledWith('response');
  });

  it('SHOULD fall back to the document copy helper when the Clipboard API is unavailable', async () => {
    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: undefined,
    });

    await expect(copyTextToClipboard('response')).resolves.toBe(true);

    expect(mockCopyToClipboard).toHaveBeenCalledWith('response');
  });

  it('SHOULD fall back to the document copy helper when Clipboard API writeText is unavailable', async () => {
    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: {},
    });

    await expect(copyTextToClipboard('response')).resolves.toBe(true);

    expect(mockCopyToClipboard).toHaveBeenCalledWith('response');
    expect(writeText).not.toHaveBeenCalled();
  });

  it('SHOULD return false when both copy methods fail', async () => {
    writeText.mockRejectedValue(new Error('Clipboard write failed'));
    mockCopyToClipboard.mockReturnValue(false);

    await expect(copyTextToClipboard('response')).resolves.toBe(false);
  });

  it('SHOULD return false when the Clipboard API rejects and document copy throws', async () => {
    writeText.mockRejectedValue(new Error('Clipboard write failed'));
    mockCopyToClipboard.mockImplementation(() => {
      throw new Error('Document copy failed');
    });

    await expect(copyTextToClipboard('response')).resolves.toBe(false);
  });

  it('SHOULD return false when there is no text to copy', async () => {
    await expect(copyTextToClipboard('')).resolves.toBe(false);

    expect(mockCopyToClipboard).not.toHaveBeenCalled();
    expect(writeText).not.toHaveBeenCalled();
  });
});
