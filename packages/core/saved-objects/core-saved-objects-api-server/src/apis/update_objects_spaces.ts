/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SavedObjectError } from '@kbn/core-saved-objects-common';
import type { MutatingOperationRefreshSetting, SavedObjectsBaseOptions } from './base';

/**
 * An object that should have its spaces updated.
 *
 * @public
 */
export interface SavedObjectsUpdateObjectsSpacesObject {
  /** The type of the object to update */
  id: string;
  /** The ID of the object to update */
  type: string;
  /**
   * The space(s) that the object to update currently exists in. This is only intended to be used by SOC wrappers.
   *
   * @internal
   */
  spaces?: string[];
  /**
   * The version of the object to update; this is used for optimistic concurrency control. This is only intended to be used by SOC wrappers.
   *
   * @internal
   */
  version?: string;
}

/**
 * Options for the update operation.
 *
 * @public
 */
export interface SavedObjectsUpdateObjectsSpacesOptions extends SavedObjectsBaseOptions {
  /** The Elasticsearch Refresh setting for this operation */
  refresh?: MutatingOperationRefreshSetting;
}

/**
 * The response when objects' spaces are updated.
 *
 * @public
 */
export interface SavedObjectsUpdateObjectsSpacesResponse {
  /** array of {@link SavedObjectsUpdateObjectsSpacesResponseObject}  */
  objects: SavedObjectsUpdateObjectsSpacesResponseObject[];
}

/**
 * Details about a specific object's update result.
 *
 * @public
 */
export interface SavedObjectsUpdateObjectsSpacesResponseObject {
  /** The type of the referenced object */
  type: string;
  /** The ID of the referenced object */
  id: string;
  /** The space(s) that the referenced object exists in */
  spaces: string[];
  /** Included if there was an error updating this object's spaces */
  error?: SavedObjectError;
}
