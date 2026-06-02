/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

jest.mock('fs/promises', () => ({
  writeFile: jest.fn(),
}));

import { writeFile } from 'fs/promises';
import { updateTranslationFile } from './update_translation_file';

const writeFileMock = writeFile as jest.MockedFunction<typeof writeFile>;

describe('updateTranslationFile', () => {
  beforeEach(() => {
    writeFileMock.mockReset();
    writeFileMock.mockResolvedValue(undefined);
  });

  test('writes locale as the first key when provided', async () => {
    await updateTranslationFile({
      namespacedTranslatedMessages: new Map(),
      targetFilePath: '/tmp/de-DE.json',
      locale: 'de-DE',
    });

    const written = writeFileMock.mock.calls[0][1] as string;
    const parsed = JSON.parse(written);
    expect(Object.keys(parsed)[0]).toBe('locale');
    expect(parsed.locale).toBe('de-DE');
  });

  test('omits locale key when not passed', async () => {
    await updateTranslationFile({
      namespacedTranslatedMessages: new Map(),
      targetFilePath: '/tmp/de-DE.json',
    });

    const written = writeFileMock.mock.calls[0][1] as string;
    const parsed = JSON.parse(written);
    expect(parsed).not.toHaveProperty('locale');
  });
});
