/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Fs from 'fs';

import dedent from 'dedent';
import { schema, Props, TypeOf } from '@kbn/config-schema';

const partialObject = <P extends Props>(props: P) => {
  return schema.object(props, {
    unknowns: 'ignore',
  });
};

export type Module = TypeOf<typeof moduleSchema>;
const moduleSchema = partialObject({
  identifier: schema.string(),
  chunks: schema.arrayOf(schema.oneOf([schema.string(), schema.number()])),
  reasons: schema.arrayOf(
    partialObject({
      userRequest: schema.string(),
    })
  ),
});

export type Chunk = TypeOf<typeof chunkSchema>;
const chunkSchema = partialObject({
  id: schema.oneOf([schema.string(), schema.number()]),
  entry: schema.boolean(),
  initial: schema.boolean(),
});

const statsSchema = partialObject({
  chunks: schema.arrayOf(chunkSchema),
  modules: schema.arrayOf(moduleSchema),
});

export interface Stats {
  path: string;
  modules: Module[];
  chunks: Chunk[];
}
export function parseStats(path: string): Stats {
  try {
    return {
      path,
      ...statsSchema.validate(JSON.parse(Fs.readFileSync(path, 'utf-8'))),
    };
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(dedent`
        unable to find stats file at [${path}]. Make sure you run the following
        before running this script:

          node scripts/build_kibana_platform_plugins --dist --profile
      `);
    }

    throw error;
  }
}

export function inAnyEntryChunk(stats: Stats, module: Module): boolean {
  return module.chunks.some((id) => {
    const chunk = stats.chunks.find((c) => c.id === id);
    if (!chunk) {
      throw new Error(
        `unable to find chunk ${id} for module ${module.identifier} in ${stats.path}`
      );
    }

    return chunk.entry || chunk.initial;
  });
}
