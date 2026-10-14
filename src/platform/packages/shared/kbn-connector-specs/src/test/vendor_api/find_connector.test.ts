/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'path';
import { findConnector } from './find_connector';

describe('findConnector', () => {
  it('finds a connector by id and the vendor_api folder next to it', async () => {
    const { connector, directory } = await findConnector('datadog');

    expect(connector.metadata.id).toBe('.datadog');
    expect(directory).toBe(path.resolve(__dirname, '../../specs/datadog/vendor_api'));
  });

  it('fails for an unknown id', async () => {
    await expect(findConnector('.nope')).rejects.toThrow('metadata.id ".nope"');
  });
});
