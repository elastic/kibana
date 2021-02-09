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
import { SavedObject, SavedObjectsClientContract, SavedObjectsFindOptions } from '../types';
import { SavedObjectsFindResult } from '../service';
import { ISavedObjectTypeRegistry } from '../saved_objects_type_registry';
import { fetchNestedDependencies } from './fetch_nested_dependencies';
import { sortObjects } from './sort_objects';
import {
  SavedObjectsExportResultDetails,
  SavedObjectExportBaseOptions,
  SavedObjectsExportByObjectOptions,
  SavedObjectsExportByTypeOptions,
  SavedObjectsExportTransform,
} from './types';
import { SavedObjectsExportError } from './errors';
import { applyExportTransforms } from './apply_export_transforms';
import { findWithPointInTime } from './find_with_point_in_time';
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
  readonly #exportTransforms: Record<string, SavedObjectsExportTransform>;
  readonly #exportSizeLimit: number;
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
    this.#exportTransforms = typeRegistry.getAllTypes().reduce((transforms, type) => {
      if (type.management?.onExport) {
        return {
          ...transforms,
          [type.name]: type.management.onExport,
        };
      }
      return transforms;
    }, {} as Record<string, SavedObjectsExportTransform>);
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
      namespace,
    }: SavedObjectExportBaseOptions
  ) {
    this.#log.debug(`Processing [${savedObjects.length}] saved objects.`);
    let exportedObjects: Array<SavedObject<unknown>>;
    let missingReferences: SavedObjectsExportResultDetails['missingReferences'] = [];

    savedObjects = await applyExportTransforms({
      request,
      objects: savedObjects,
      transforms: this.#exportTransforms,
      sortFunction,
    });

    if (includeReferencesDeep) {
      this.#log.debug(`Fetching saved objects references.`);
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
    const finder = findWithPointInTime({
      logger: this.#log,
      savedObjectsClient: this.#savedObjectsClient,
    });

    const options: SavedObjectsFindOptions = {
      type: types,
      hasReference,
      hasReferenceOperator: hasReference ? 'OR' : undefined,
      search,
      namespaces: namespace ? [namespace] : undefined,
    };

    const hits: SavedObjectsFindResult[] = [];
    for await (const result of finder.find(options)) {
      hits.push(...result.saved_objects);
      if (hits.length > this.#exportSizeLimit) {
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
