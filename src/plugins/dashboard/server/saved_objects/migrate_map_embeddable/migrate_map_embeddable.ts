/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SavedObjectMigrationFn } from 'kibana/server';
import { extractReferences } from './extract_references';
import { SavedDashboardPanel } from '../../../common/types';

// Fix bug in by-value map embeddable where references where not properly extracted so that references could be replace with ids.
// https://github.com/elastic/kibana/issues/125595
export const migrateMapEmbeddable: SavedObjectMigrationFn<any, any> = (doc) => {
  if (!doc.attributes || !doc.attributes.panelsJSON) {
    return doc;
  }

  const dashboardReferences = doc.references ? [...doc.references] : [];

  let panels: SavedDashboardPanel[] = [];
  try {
    panels = JSON.parse(doc.attributes.panelsJSON);
  } catch (error) {
    // ignore error
    return doc;
  }

  const migratedPanels = panels.map((panel) => {
    if (panel.type !== 'map' || !panel.embeddableConfig.attributes) {
      return panel;
    }

    const { attributes, references } = extractReferences({
      attributes: panel.embeddableConfig.attributes as Record<string, string>,
      embeddableId: panel.panelIndex,
    });
    dashboardReferences.push(...references);
    return {
      ...panel,
      embeddableConfig: {
        ...panel.embeddableConfig,
        attributes,
      },
    };
  });

  return {
    ...doc,
    attributes: {
      ...doc.attributes,
      panelsJSON: JSON.stringify(migratedPanels),
    },
    references: dashboardReferences,
  };
};
