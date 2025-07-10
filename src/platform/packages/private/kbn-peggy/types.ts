/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

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

export interface SyncOptions extends Options {
  /** the content of the peggy grammar to parse */
  content: string;
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
