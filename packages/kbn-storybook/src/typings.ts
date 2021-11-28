/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// Storybook react doesn't declare this in its typings, but it's there.
declare module '@storybook/react/standalone';

// Storybook references this module. It's @ts-ignored in the codebase but when
// built into its dist it strips that out. Add it here to avoid a type checking
// error.
//
// See https://github.com/storybookjs/storybook/issues/11684
declare module 'react-syntax-highlighter/dist/cjs/create-element';
declare module 'react-syntax-highlighter/dist/cjs/prism-light';

// Storybook uses this module and its types are defined in the source but not in the type output
declare module 'file-system-cache' {
  interface Options {
    basePath?: string;
    ns?: string | string[];
    extension?: string;
  }

  class FileSystemCache {
    constructor(options: Options);
    path(key: string): string;
    fileExists(key: string): Promise<boolean>;
    ensureBasePath(): Promise<void>;
    get(key: string, defaultValue?: any): Promise<any | typeof defaultValue>;
    getSync(key: string, defaultValue?: any): any | typeof defaultValue;
    set(key: string, value: any): Promise<{ path: string }>;
    setSync(key: string, value: any): this;
    remove(key: string): Promise<void>;
    clear(): Promise<void>;
    save(): Promise<{ paths: string[] }>;
    load(): Promise<{ files: Array<{ path: string; value: any }> }>;
  }
}
