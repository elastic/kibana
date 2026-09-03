/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** ElasticOn copy uses "resource(s)" in place of "entity/entities". */
export const labThing = (resourceCopy: boolean): string => (resourceCopy ? 'resource' : 'entity');

export const labThings = (resourceCopy: boolean): string =>
  resourceCopy ? 'resources' : 'entities';

export const labThingLabel = (resourceCopy: boolean): string =>
  resourceCopy ? 'Resource' : 'Entity';
