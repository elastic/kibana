/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import Fs from 'fs';
import Fsp from 'fs/promises';

import Peggy from 'peggy';

export interface Options {
  /**
   * The path to the peggy content. If this is not defined then
   * config files can not be found and `content` must be passed.
   */
  path?: string;
  /**
   * Prevent loading the content from disk by specifying it here
   */
  content?: string;
  /**
   * Prevent loading the config from disk by specifying it here
   */
  config?: Config;
  /**
   * What type of module format should the generated code use. Defaults to
   * commonjs for broadest compatibility
   */
  format?: 'esm' | 'commonjs';
  /**
   * Should the parser optimize for execution speed or size of the code
   */
  optimize?: 'size' | 'speed';
  /**
   * Disable checking for a config file a `{basename}.config.json` in
   * the same directory as the grammar file.
   */
  skipConfigSearch?: boolean;
}

export interface Config {
  /** the path of the discovered config file */
  path: string;
  /** the content of the config file as a string (primarily for hashing) */
  source: string;
  /** the parsed content of the config file */
  parsed: any;
}

export interface Result {
  /**
   * The source code of the module which parses expressions in the format
   * defined by the peggy grammar file
   */
  config: Config | null;

  /**
   * The loaded config if it was found
   */
  source: string;
}

export function findConfigFile(grammarPath: string): Config | undefined {
  const path = Path.resolve(Path.dirname(grammarPath), `${Path.basename(grammarPath)}.config.json`);

  let source;
  let parsed;
  try {
    source = Fs.readFileSync(path, 'utf8');
    parsed = JSON.parse(source);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return undefined;
    }

    throw error;
  }

  return { path, source, parsed };
}

export async function getJsSource(options: Options): Promise<Result> {
  let source;
  if (options.content) {
    source = options.content;
  } else if (options.path) {
    source = await Fsp.readFile(options.path, 'utf8');
  } else {
    throw new Error('you must either specify the path of the grammar file, or the content');
  }

  return getJsSourceSync({
    content: source,
    ...options,
  });
}

export function getJsSourceSync(
  options: Options & {
    /** The content of the grammar file to parse */
    content: string;
  }
): Result {
  const config =
    options.config ??
    (options.path && options.skipConfigSearch !== true ? findConfigFile(options.path) : null);

  const result = Peggy.generate(options.content, {
    ...config?.parsed,
    format: options.format === 'esm' ? 'es' : 'commonjs',
    optimize: options.optimize,
    output: 'source',
  });

  return {
    /**
     * The source code of the module which parses expressions in the format
     * defined by the peggy grammar file
     */
    source: result as unknown as string,

    /**
     * The loaded config if it was found
     */
    config: config ?? null,
  };
}

export const VERSION = Peggy.VERSION;
