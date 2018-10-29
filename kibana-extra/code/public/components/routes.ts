/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
export enum PathTypes {
  blob = 'blob',
  tree = 'tree',
}

export const ROOT = '/';
export const MAIN = `/:resource/:org/:repo/:pathType(${PathTypes.blob}|${
  PathTypes.tree
})/:revision/:path*:goto(!.*)?`;
export const REPO = `/:resource/:org/:repo`;
export const MAIN_ROOT = `/:resource/:org/:repo/:pathType(${PathTypes.blob}|${
  PathTypes.tree
})/:revision`;
export const ADMIN = '/admin';
export const SEARCH = '/search';
export const DIFF = '/commit/:resource/:org/:repo/:commitId';
