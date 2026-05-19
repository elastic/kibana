/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

declare namespace _exports {
  export { KibanaPackageJson };
}
declare namespace _exports {
  export { REPO_ROOT };
  export { PKG_JSON };
  export { PKG_JSON as kibanaPackageJson };
  export function isKibanaDistributable(): boolean;
  export { UPSTREAM_BRANCH };
  export { fromRoot };
}
export = _exports;
type KibanaPackageJson = import('./types').KibanaPackageJson;
declare const REPO_ROOT: string;
declare const PKG_JSON: import('./types').KibanaPackageJson;
declare const UPSTREAM_BRANCH: string;
/**
 * @param {string[]} paths
 */
declare function fromRoot(...paths: string[]): string;
