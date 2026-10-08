/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs/promises';
import path from 'path';
import { vendorApiExemptionsSchema } from './exemptions';
import { findConnector } from './find_connector';

const EXEMPTIONS = path.resolve(__dirname, '../../../vendor_api_exemptions.json');

describe('vendor_api_exemptions.json', () => {
  it('lists existing connectors without a vendor_api folder, each with a reason', async () => {
    const exemptions = vendorApiExemptionsSchema.parse(
      JSON.parse(await fs.readFile(EXEMPTIONS, 'utf8'))
    );

    for (const id of Object.keys(exemptions)) {
      const { directory } = await findConnector(id);
      await expect(fs.access(directory)).rejects.toThrow('ENOENT');
    }
  });
});
