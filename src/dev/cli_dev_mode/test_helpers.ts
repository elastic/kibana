/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

export const extendedEnvSerializer: jest.SnapshotSerializerPlugin = {
  test: (v) =>
    typeof v === 'object' &&
    v !== null &&
    typeof v.env === 'object' &&
    v.env !== null &&
    !v.env['<inheritted process.env>'],

  serialize(val, config, indentation, depth, refs, printer) {
    const customizations: Record<string, unknown> = {
      '<inheritted process.env>': true,
    };
    for (const [key, value] of Object.entries(val.env)) {
      if (process.env[key] !== value) {
        customizations[key] = value;
      }
    }

    return printer(
      {
        ...val,
        env: customizations,
      },
      config,
      indentation,
      depth,
      refs
    );
  },
};
