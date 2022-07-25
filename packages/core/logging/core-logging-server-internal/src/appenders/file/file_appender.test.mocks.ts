/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

jest.mock('../../layouts/layouts', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { schema } = require('@kbn/config-schema');
  return {
    Layouts: {
      configSchema: schema.object({
        type: schema.literal('mock'),
      }),
    },
  };
});

export const mockCreateWriteStream = jest.fn();
export const mockMkdirSync = jest.fn();
jest.mock('fs', () => ({ createWriteStream: mockCreateWriteStream, mkdirSync: mockMkdirSync }));
