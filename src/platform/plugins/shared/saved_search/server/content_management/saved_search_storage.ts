/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  PartialSavedObject,
  SOWithMetadata,
  SOWithMetadataPartial,
} from '@kbn/content-management-utils';
import { SOContentStorage } from '@kbn/content-management-utils';
import type { Logger } from '@kbn/logging';
import type { SavedObject } from '@kbn/core/server';
import type { SavedSearchCrudTypes } from '../../common/content_management';
import { SavedSearchType } from '../../common/content_management';
import { cmServicesDefinition } from './schema/cm_services';
import { extractTabs } from '../../common';

export class SavedSearchStorage extends SOContentStorage<SavedSearchCrudTypes> {
  constructor({
    logger,
    throwOnResultValidationError,
  }: {
    logger: Logger;
    throwOnResultValidationError: boolean;
  }) {
    super({
      savedObjectType: SavedSearchType,
      cmServicesDefinition,
      enableMSearch: true,
      allowedSavedObjectAttributes: [
        'title',
        'sort',
        'columns',
        'description',
        'grid',
        'hideChart',
        'isTextBasedQuery',
        'usesAdHocDataView',
        'controlGroupJson',
        'kibanaSavedObjectMeta',
        'viewMode',
        'hideAggregatedPreview',
        'rowHeight',
        'headerRowHeight',
        'timeRestore',
        'timeRange',
        'refreshInterval',
        'rowsPerPage',
        'breakdownField',
        'sampleSize',
        'density',
        'visContext',
        'tabs',
      ],
      logger,
      throwOnResultValidationError,
    });
  }

  override savedObjectToItem(
    savedObject: SavedObject<SavedSearchCrudTypes['Attributes']>
  ): SavedSearchCrudTypes['Item'];
  override savedObjectToItem(
    savedObject: PartialSavedObject<SavedSearchCrudTypes['Attributes']>,
    partial: true
  ): SavedSearchCrudTypes['PartialItem'];
  override savedObjectToItem(
    savedObject:
      | SavedObject<SavedSearchCrudTypes['Attributes']>
      | PartialSavedObject<SavedSearchCrudTypes['Attributes']>,
    partial?: boolean
  ): SOWithMetadata | SOWithMetadataPartial {
    if (partial) {
      return super.savedObjectToItem(savedObject, true);
    }

    const so = super.savedObjectToItem(
      savedObject as SavedObject<SavedSearchCrudTypes['Attributes']>
    );

    // Despite our saved object transforms and what the types indicate,
    // we can still end up with Discover sessions without tabs that were
    // imported directly through the deprecated saved object APIs.
    // This is a backfill to ensure that any saved object we return
    // always has tabs. Ideally it can be removed once Core addresses
    // the issue at the saved objects API level.
    if (!so.attributes.tabs?.length) {
      so.attributes = extractTabs(so.attributes, so.id);
    }

    return so;
  }
}
