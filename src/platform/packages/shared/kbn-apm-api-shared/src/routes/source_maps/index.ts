/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { listSourceMapsRoute } from './list_source_maps';
import { uploadSourceMapRoute } from './upload_source_map';
import { deleteSourceMapRoute } from './delete_source_map';
import { migrateFleetArtifactsRoute } from './migrate_fleet_artifacts';

export const sourceMapsRouteDefinitions = {
  list: listSourceMapsRoute,
  upload: uploadSourceMapRoute,
  delete: deleteSourceMapRoute,
  migrateFleetArtifacts: migrateFleetArtifactsRoute,
};

export { sourceMapRt, type SourceMap, type ApmSourceMapArtifactBody } from './source_map_types';
export type { ListSourceMapArtifactsResponse } from './list_source_maps';
export type { UploadSourceMapResponse } from './upload_source_map';
