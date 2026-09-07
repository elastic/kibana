/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface ModelVersionFixtures {
  [modelVersion: string]: FixtureTemplate[];
}

export interface FixtureTemplate {
  [propName: string]: PropValue | PropValue[] | FixtureTemplate;
}

export interface TypeVersionFixtures {
  relativePath: string; // e.g. 'relative path to the fixture file'
  version: string; // e.g. 10.2.0
  documents: FixtureTemplate[];
}

export type PropValue = string | boolean | number;

export interface ModelVersionSchemaProperty {
  path: string[];
  type: string;
}
