/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export declare function readReturnParamsFromHash(hash: string):
  | {
      returnAppId: string;
      returnPath: string;
    }
  | undefined;
export declare function getTutorialDirectoryFirstCrumb({
  hash,
  addBasePath,
  getUrlForApp,
}: {
  hash: string;
  addBasePath: (path: string) => string;
  getUrlForApp: (
    appId: string,
    options: {
      path: string;
    }
  ) => string;
}): {
  text: string;
  href: string;
};
export declare function getTutorialDirectoryAppHeaderBack({
  hash,
  addBasePath,
  getUrlForApp,
}: {
  hash: string;
  addBasePath: (path: string) => string;
  getUrlForApp: (
    appId: string,
    options: {
      path: string;
    }
  ) => string;
}): {
  href: string;
  label: string;
};
export declare function getTutorialIntroductionBackLink({
  hash,
  addBasePath,
  getUrlForApp,
}: {
  hash: string;
  addBasePath: (path: string) => string;
  getUrlForApp: (
    appId: string,
    options: {
      path: string;
    }
  ) => string;
}): {
  href: string;
  text?: string;
};
