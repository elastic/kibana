/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

declare module '*.html' {
  const template: string;
  // eslint-disable-next-line import/no-default-export
  export default template;
}

declare module '*.png' {
  const content: string;
  // eslint-disable-next-line import/no-default-export
  export default content;
}

declare module '*.svg' {
  const content: string;
  // eslint-disable-next-line import/no-default-export
  export default content;
}

declare module '*.mdx' {
  let MDXComponent: (props: any) => JSX.Element;
  // eslint-disable-next-line import/no-default-export
  export default MDXComponent;
}

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
