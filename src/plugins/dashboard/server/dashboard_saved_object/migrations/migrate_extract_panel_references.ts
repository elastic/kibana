/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SavedObject, SavedObjectMigrationFn } from '@kbn/core/server';

import { extractReferences, injectReferences } from '../../../common';
import type { DashboardSavedObjectTypeMigrationsDeps } from './dashboard_saved_object_migrations';
import type { DashboardSavedObjectAttributes } from '../schema';
import { itemAttrsToSavedObjectAttrs, savedObjectToItem } from '../../content_management/latest';

/**
 * In 7.8.0 we introduced dashboard drilldowns which are stored inside dashboard saved object as part of embeddable state
 * In 7.11.0 we created an embeddable references/migrations system that allows to properly extract embeddable persistable state
 * https://github.com/elastic/kibana/issues/71409
 * The idea of this migration is to inject all the embeddable panel references and then run the extraction again.
 * As the result of the extraction:
 * 1. In addition to regular `panel_` we will get new references which are extracted by `embeddablePersistableStateService` (dashboard drilldown references)
 * 2. `panel_` references will be regenerated
 * All other references like index-patterns are forwarded non touched
 * @param deps
 */
export function createExtractPanelReferencesMigration(
  deps: DashboardSavedObjectTypeMigrationsDeps
): SavedObjectMigrationFn<DashboardSavedObjectAttributes> {
  return (doc) => {
    const references = doc.references ?? [];

    /**
     * Remembering this because dashboard's extractReferences won't return those
     * All other references like `panel_` will be overwritten
     */
    const oldNonPanelReferences = references.filter((ref) => !ref.name.startsWith('panel_'));

    // Use Content Management to convert the saved object to the DashboardAttributes
    // expected by injectReferences
    const { attributes: parsedAttributes } = savedObjectToItem(
      doc as unknown as SavedObject<DashboardSavedObjectAttributes>
    );

    const injectedAttributes = injectReferences(
      {
        attributes: parsedAttributes,
        references,
      },
      { embeddablePersistableStateService: deps.embeddable }
    );

    const { attributes: extractedAttributes, references: newPanelReferences } = extractReferences(
      { attributes: injectedAttributes, references: [] },
      { embeddablePersistableStateService: deps.embeddable }
    );

    const attributes = itemAttrsToSavedObjectAttrs(extractedAttributes);

    return {
      ...doc,
      references: [...oldNonPanelReferences, ...newPanelReferences],
      attributes,
    };
  };
}
