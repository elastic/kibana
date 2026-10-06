/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectUnsanitizedDoc } from '@kbn/core-saved-objects-server';
import type { TransformType } from '../types';
import { type Transform } from '../types';
/** transform types using `coreMigrationVersion` and not `typeMigrationVersion` */
export declare const coreVersionTransformTypes: TransformType[];
/**
 * Apply the version of the given {@link Transform | transform} to the given {@link SavedObjectUnsanitizedDoc | document}.
 * Will update `coreMigrationVersion` or `typeMigrationVersion` depending on the type of the transform.
 */
export declare const applyVersion: ({
  document,
  transform,
}: {
  document: SavedObjectUnsanitizedDoc;
  transform: Transform;
}) => SavedObjectUnsanitizedDoc;
/**
 * Asserts the document's core version is valid and not greater than the current Kibana version.
 * Hence, the object does not belong to a more recent version of Kibana.
 */
export declare const assertValidCoreVersion: ({
  kibanaVersion,
  document,
}: {
  document: SavedObjectUnsanitizedDoc;
  kibanaVersion: string;
}) => void;
export declare function maxVersion(a?: string, ...otherVersions: string[]): string | undefined;
