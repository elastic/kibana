/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createListStream } from '@kbn/utils';
import { PublicMethodsOf } from '@kbn/utility-types';
import { Logger } from '../../logging';
import { SavedObject, SavedObjectsClientContract } from '../types';
import { SavedObjectsFindResult } from '../service';
import { ISavedObjectTypeRegistry } from '../saved_objects_type_registry';
import { sortObjects } from './sort_objects';
import {
  SavedObjectsExportResultDetails,
  SavedObjectExportBaseOptions,
  SavedObjectsExportByObjectOptions,
  SavedObjectsExportByTypeOptions,
} from './types';
import { SavedObjectsExportError } from './errors';
import { collectExportedObjects } from './collect_exported_objects';
import { byIdAscComparator, getPreservedOrderComparator, SavedObjectComparator } from './utils';

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
  readonly #typeRegistry: ISavedObjectTypeRegistry;
  readonly #log: Logger;

  constructor({
    savedObjectsClient,
    typeRegistry,
    exportSizeLimit,
    logger,
  }: {
    savedObjectsClient: SavedObjectsClientContract;
    typeRegistry: ISavedObjectTypeRegistry;
    exportSizeLimit: number;
    logger: Logger;
  }) {
    this.#log = logger;
    this.#savedObjectsClient = savedObjectsClient;
    this.#exportSizeLimit = exportSizeLimit;
    this.#typeRegistry = typeRegistry;
  }

  /**
   * Generates an export stream for given types.
   *
   * See the {@link SavedObjectsExportByTypeOptions | options} for more detailed information.
   *
   * @throws SavedObjectsExportError
   */
  public async exportByTypes(options: SavedObjectsExportByTypeOptions) {
    this.#log.debug(`Initiating export for types: [${options.types}]`);
    const objects = await this.fetchByTypes(options);
    return this.processObjects(objects, byIdAscComparator, {
      request: options.request,
      includeReferencesDeep: options.includeReferencesDeep,
      includeNamespaces: options.includeNamespaces,
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
    this.#log.debug(`Initiating export of [${options.objects.length}] objects.`);
    if (options.objects.length > this.#exportSizeLimit) {
      throw SavedObjectsExportError.exportSizeExceeded(this.#exportSizeLimit);
    }
    const objects = await this.fetchByObjects(options);
    const comparator = getPreservedOrderComparator(objects);
    return this.processObjects(objects, comparator, {
      request: options.request,
      includeReferencesDeep: options.includeReferencesDeep,
      includeNamespaces: options.includeNamespaces,
      excludeExportDetails: options.excludeExportDetails,
      namespace: options.namespace,
    });
  }

  private async processObjects(
    savedObjects: SavedObject[],
    sortFunction: SavedObjectComparator,
    {
      request,
      excludeExportDetails = false,
      includeReferencesDeep = false,
      includeNamespaces = false,
      namespace,
    }: SavedObjectExportBaseOptions
  ) {
    this.#log.debug(`Processing [${savedObjects.length}] saved objects.`);

    const {
      objects: collectedObjects,
      missingRefs: missingReferences,
      excludedObjects,
    } = await collectExportedObjects({
      objects: savedObjects,
      includeReferences: includeReferencesDeep,
      namespace,
      request,
      typeRegistry: this.#typeRegistry,
      savedObjectsClient: this.#savedObjectsClient,
      logger: this.#log,
    });

    // sort with the provided sort function then with the default export sorting
    const exportedObjects = sortObjects(collectedObjects.sort(sortFunction));

    // redact attributes that should not be exported
    const redactedObjects = includeNamespaces
      ? exportedObjects
      : exportedObjects.map<SavedObject<unknown>>(({ namespaces, ...object }) => object);

    const exportDetails: SavedObjectsExportResultDetails = {
      exportedCount: exportedObjects.length,
      missingRefCount: missingReferences.length,
      missingReferences,
      excludedObjectsCount: excludedObjects.length,
      excludedObjects,
    };
    this.#log.debug(`Exporting [${redactedObjects.length}] saved objects.`);
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
    const finder = this.#savedObjectsClient.createPointInTimeFinder({
      type: types,
      hasReference,
      hasReferenceOperator: hasReference ? 'OR' : undefined,
      search,
      namespaces: namespace ? [namespace] : undefined,
    });

    const hits: SavedObjectsFindResult[] = [];
    for await (const result of finder.find()) {
      hits.push(...result.saved_objects);
      if (hits.length > this.#exportSizeLimit) {
        await finder.close();
        throw SavedObjectsExportError.exportSizeExceeded(this.#exportSizeLimit);
      }
    }

    // sorts server-side by _id, since it's only available in fielddata
    return (
      hits
        // exclude the find-specific `score` property from the exported objects
        .map(({ score, ...obj }) => obj)
        .sort(byIdAscComparator)
    );
  }
}
