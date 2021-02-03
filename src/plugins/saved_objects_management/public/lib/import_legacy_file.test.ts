/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { importLegacyFile } from './import_legacy_file';

describe('importFile', () => {
  it('should import a file with valid json format', async () => {
    const file = new File([`{"text": "foo"}`], 'file.json');

    const imported = await importLegacyFile(file);
    expect(imported).toEqual({ text: 'foo' });
  });

  it('should throw errors when file content is not parseable', async () => {
    const file = new File([`not_parseable`], 'file.json');

    await expect(importLegacyFile(file)).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Unexpected token o in JSON at position 1"`
    );
  });
});
