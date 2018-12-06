/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export enum SearchScope {
  repository = 'repository',
  default = 'default',
  symbol = 'symbol',
}

export enum PathTypes {
  blob = 'blob',
  tree = 'tree',
}

export interface MainRouteParams {
  path: string;
  repo: string;
  resource: string;
  org: string;
  revision: string;
  pathType: PathTypes;
}
