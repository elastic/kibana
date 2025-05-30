/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { inspect } from 'util';
import { SavedObject, SavedObjectMigrationParams } from '@kbn/core-saved-objects-server';
import type { DashboardSavedObjectAttributes } from '../schema';
import type { DashboardSavedObjectTypeMigrationsDeps } from './dashboard_saved_object_migrations';
import { itemToSavedObject, savedObjectToItem } from '../../content_management/latest';

/**
 * In 7.8.0 we introduced dashboard drilldowns which are stored inside dashboard saved object as part of embeddable state
 * In 7.11.0 we created an embeddable references/migrations system that allows to properly extract embeddable persistable state
 * https://github.com/elastic/kibana/issues/71409
 * The idea of this migration is to inject all the embeddable panel references and then run the extraction again.
 * As the result of the extraction:
 * 1. In addition to regular `panel_` we will get new references which are extracted by `embeddablePersistableStateService` (dashboard drilldown references)
 * 2. `panel_` references will be regenerated
 * All other references like index-patterns are forwarded non touched
 *
 * This migration uses the deferred flag on {@link SavedObjectMigrationParams | SavedObjectMigrationParams} which means the
 * migration only runs when the saved object is accessed. This ensures that the embeddable service is available and can be
 * used to extract the references correctly.
 */
export function createExtractPanelReferencesMigration(
  deps: DashboardSavedObjectTypeMigrationsDeps
): SavedObjectMigrationParams<DashboardSavedObjectAttributes> {
  return {
    deferred: true,
    transform: (doc, { log }) => {
      const references = doc.references ?? [];
      const getExceptionMessage = (error: Error) =>
        `Exception @ createExtractPanelReferencesMigration while trying to extract dashboard panels!\n` +
        `${error.stack}\n` +
        `dashboard: ${inspect(doc, false, null)}`;
      /**
       * Remembering this because dashboard's extractReferences won't return those
       * All other references like `panel_` will be overwritten
       */
      const oldNonPanelReferences = references.filter((ref) => !ref.name.startsWith('panel_'));

      const embeddableStart = deps.getEmbeddableStart();
      if (!embeddableStart) {
        log.warn(
          `Exception @ createExtractPanelReferencesMigration!\nEmbeddable start service is not available.`
        );
        return doc;
      }

      // Content Management transform functions `savedObjectToItem` and `itemToSavedObject`
      // will run embeddable inject and extract functions for each panel
      const { item, error: itemError } = savedObjectToItem(
        doc as unknown as SavedObject<DashboardSavedObjectAttributes>,
        embeddableStart,
        false
      );

      if (itemError) {
        log.warn(getExceptionMessage(itemError));
        return doc;
      }

      const {
        attributes,
        error: attributesError,
        references: newPanelReferences,
      } = itemToSavedObject({ attributes: item.attributes, embeddable: embeddableStart });
      if (attributesError) {
        log.warn(getExceptionMessage(attributesError));
        return doc;
      }

      return {
        ...doc,
        references: [...oldNonPanelReferences, ...newPanelReferences],
        attributes,
      };
    },
  };
}
