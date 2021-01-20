/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { createListStream } from '@kbn/utils';
import { PublicMethodsOf } from '@kbn/utility-types';
import { SavedObject, SavedObjectsClientContract } from '../types';
import { fetchNestedDependencies } from './fetch_nested_dependencies';
import { sortObjects } from './sort_objects';
import {
  SavedObjectsExportResultDetails,
  SavedObjectExportBaseOptions,
  SavedObjectsExportByObjectOptions,
  SavedObjectsExportByTypeOptions,
} from './types';
import { SavedObjectsExportError } from './errors';

/**
 * @public
 */
export type ISavedObjectsExporter = PublicMethodsOf<SavedObjectsExporter>;

/**
 * @public
 */
export class SavedObjectsExporter {
  readonly #savedObjectsClient: SavedObjectsClientContract;
  readonly #exportSizeLimit: number;

  constructor({
    savedObjectsClient,
    exportSizeLimit,
  }: {
    savedObjectsClient: SavedObjectsClientContract;
    exportSizeLimit: number;
  }) {
    this.#savedObjectsClient = savedObjectsClient;
    this.#exportSizeLimit = exportSizeLimit;
  }

  /**
   * Generates an export stream for given types.
   *
   * See the {@link SavedObjectsExportByTypeOptions | options} for more detailed information.
   *
   * @throws SavedObjectsExportError
   */
  public async exportByTypes(options: SavedObjectsExportByTypeOptions) {
    const objects = await this.fetchByTypes(options);
    return this.processObjects(objects, {
      includeReferencesDeep: options.includeReferencesDeep,
      excludeExportDetails: options.excludeExportDetails,
      namespace: options.namespace,
    });
  }

  /**
   * Generates an export stream for given object references.
   *
   * See the {@link SavedObjectsExportByObjectOptions | options} for more detailed information.
   *
   * @throws SavedObjectsExportError
   */
  public async exportByObjects(options: SavedObjectsExportByObjectOptions) {
    if (options.objects.length > this.#exportSizeLimit) {
      throw SavedObjectsExportError.exportSizeExceeded(this.#exportSizeLimit);
    }
    const objects = await this.fetchByObjects(options);
    return this.processObjects(objects, {
      includeReferencesDeep: options.includeReferencesDeep,
      excludeExportDetails: options.excludeExportDetails,
      namespace: options.namespace,
    });
  }

  private async processObjects(
    savedObjects: SavedObject[],
    {
      excludeExportDetails = false,
      includeReferencesDeep = false,
      namespace,
    }: SavedObjectExportBaseOptions
  ) {
    let exportedObjects: Array<SavedObject<unknown>>;
    let missingReferences: SavedObjectsExportResultDetails['missingReferences'] = [];

    if (includeReferencesDeep) {
      const fetchResult = await fetchNestedDependencies(
        savedObjects,
        this.#savedObjectsClient,
        namespace
      );
      exportedObjects = sortObjects(fetchResult.objects);
      missingReferences = fetchResult.missingRefs;
    } else {
      exportedObjects = sortObjects(savedObjects);
    }

    // redact attributes that should not be exported
    const redactedObjects = exportedObjects.map<SavedObject<unknown>>(
      ({ namespaces, ...object }) => object
    );

    const exportDetails: SavedObjectsExportResultDetails = {
      exportedCount: exportedObjects.length,
      missingRefCount: missingReferences.length,
      missingReferences,
    };
    return createListStream([...redactedObjects, ...(excludeExportDetails ? [] : [exportDetails])]);
  }

  private async fetchByObjects({ objects, namespace }: SavedObjectsExportByObjectOptions) {
    const bulkGetResult = await this.#savedObjectsClient.bulkGet(objects, { namespace });
    const erroredObjects = bulkGetResult.saved_objects.filter((obj) => !!obj.error);
    if (erroredObjects.length) {
      throw SavedObjectsExportError.objectFetchError(erroredObjects);
    }
    return bulkGetResult.saved_objects;
  }

  private async fetchByTypes({
    types,
    namespace,
    hasReference,
    search,
  }: SavedObjectsExportByTypeOptions) {
    const findResponse = await this.#savedObjectsClient.find({
      type: types,
      hasReference,
      hasReferenceOperator: hasReference ? 'OR' : undefined,
      search,
      perPage: this.#exportSizeLimit,
      namespaces: namespace ? [namespace] : undefined,
    });
    if (findResponse.total > this.#exportSizeLimit) {
      throw SavedObjectsExportError.exportSizeExceeded(this.#exportSizeLimit);
    }

    // sorts server-side by _id, since it's only available in fielddata
    return (
      findResponse.saved_objects
        // exclude the find-specific `score` property from the exported objects
        .map(({ score, ...obj }) => obj)
        .sort((a: SavedObject, b: SavedObject) => (a.id > b.id ? 1 : -1))
    );
  }
}
