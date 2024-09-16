/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SOContentStorage, tagsToFindOptions } from '@kbn/content-management-utils';
import { SavedObjectsFindOptions } from '@kbn/core-saved-objects-api-server';
import type { Logger } from '@kbn/logging';

import { CONTENT_ID } from '../../common/content_management';
import { cmServicesDefinition } from './schema/cm_services';
import type { DashboardCrudTypes } from '../../common/content_management';
import { InjectExtractDeps } from '../../common';
import { itemAttrsToSavedObjectAttrs, savedObjectToItem } from './schema/latest';

const searchArgsToSOFindOptions = (
  args: DashboardCrudTypes['SearchIn']
): SavedObjectsFindOptions => {
  const { query, contentTypeId, options } = args;

  return {
    type: contentTypeId,
    searchFields: options?.onlyTitle ? ['title'] : ['title^3', 'description'],
    fields: ['description', 'title', 'timeRestore'],
    search: query.text,
    perPage: query.limit,
    page: query.cursor ? +query.cursor : undefined,
    defaultSearchOperator: 'AND',
    ...tagsToFindOptions(query.tags),
  };
};

export class DashboardStorage extends SOContentStorage<DashboardCrudTypes> {
  constructor({
    logger,
    throwOnResultValidationError,
    deps,
  }: {
    logger: Logger;
    throwOnResultValidationError: boolean;
    deps: InjectExtractDeps;
  }) {
    const allowedSavedObjectAttributes = [
      'kibanaSavedObjectMeta',
      'controlGroupInput',
      'refreshInterval',
      'description',
      'timeRestore',
      'options',
      'panels',
      'timeFrom',
      'version',
      'timeTo',
      'title',
    ];
    super({
      savedObjectType: CONTENT_ID,
      cmServicesDefinition,
      searchArgsToSOFindOptions,
      enableMSearch: true,
      allowedSavedObjectAttributes,
      itemAttrsToSavedObjectAttrs,
      // TODO fix this type error by differentiating between SavedObject Attributes and Item Attributes
      savedObjectToItem,
      logger,
      throwOnResultValidationError,
    });
  }
}
