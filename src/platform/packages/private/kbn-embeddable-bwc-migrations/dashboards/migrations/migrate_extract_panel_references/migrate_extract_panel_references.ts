/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectMigrationFn } from '@kbn/core/server';
import type { EmbeddableSetup } from '@kbn/embeddable-plugin/server';
import type { EmbeddableReferenceManagers } from '../../../get_all_embeddable_reference_managers';
import type { RawDashboardSavedObjectAttributes } from '../types';
import { extractReferences, injectReferences } from './dashboard_saved_object_references';

/**
 * In 7.8.0 we introduced dashboard drilldowns which are stored inside dashboard saved object as part of embeddable state
 * In 7.11.0 we created an embeddable references/migrations system that allows to properly extract embeddable persistable state
 * https://github.com/elastic/kibana/issues/71409
 * The idea of this migration is to inject all the embeddable panel references and then run the extraction again.
 * As the result of the extraction:
 * 1. In addition to regular `panel_` we will get new references which are extracted by `embeddablePersistableStateService` (dashboard drilldown references)
 * 2. `panel_` references will be regenerated
 * All other references like index-patterns are forwarded non touched
 */
export function createExtractPanelReferencesMigration(
  bwcEmbeddableReferenceManagers: EmbeddableReferenceManagers,
  embeddableSetup: EmbeddableSetup // TODO remove this argument when all legacy serverside inject / extract logic is moved into kbn-embeddable-bwc-migrations
): SavedObjectMigrationFn<RawDashboardSavedObjectAttributes> {
  return (doc) => {
    const references = doc.references ?? [];

    /**
     * Remembering this because dashboard's extractReferences won't return those
     * All other references like `panel_` will be overwritten
     */
    const oldNonPanelReferences = references.filter((ref) => !ref.name.startsWith('panel_'));

    const injectedAttributes = injectReferences(
      {
        attributes: doc.attributes,
        references,
      },
      bwcEmbeddableReferenceManagers,
      embeddableSetup
    );

    const { attributes, references: newPanelReferences } = extractReferences(
      { attributes: injectedAttributes, references: [] },
      bwcEmbeddableReferenceManagers,
      embeddableSetup
    );

    return {
      ...doc,
      references: [...oldNonPanelReferences, ...newPanelReferences],
      attributes,
    };
  };
}
