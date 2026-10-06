/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/logging';
import type { SavedObjectsType, SavedObjectsModelVersion } from '@kbn/core-saved-objects-server';
import { type Transform, type TransformFn, type TypeVersionSchema } from './types';
export declare const getModelVersionSchemas: ({
  typeDefinition,
}: {
  typeDefinition: SavedObjectsType;
}) => Record<string, TypeVersionSchema>;
export declare const getModelVersionTransforms: ({
  typeDefinition,
  log,
}: {
  typeDefinition: SavedObjectsType;
  log: Logger;
}) => Transform[];
export declare const convertModelVersionTransformFn: ({
  typeDefinition,
  virtualVersion,
  modelVersion,
  modelVersionDefinition,
  log,
}: {
  typeDefinition: SavedObjectsType;
  virtualVersion: string;
  modelVersion: number;
  modelVersionDefinition: SavedObjectsModelVersion;
  log: Logger;
}) => TransformFn;
