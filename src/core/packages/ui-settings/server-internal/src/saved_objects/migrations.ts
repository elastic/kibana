/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  SavedObjectUnsanitizedDoc,
  SavedObjectSanitizedDoc,
  SavedObjectsModelVersionMap,
} from '@kbn/core-saved-objects-server';

/**
 * @note Since all `uiSettings` migrations are added to the same migration function,
 * while not required, grouping settings by team, using a consistent naming prefix,
 * is good practice. For example: `ml:<setting-name>`.
 */

export const modelVersions: SavedObjectsModelVersionMap = {
  /**
   * First model version picks up from the last legacy migration in 8.9.0.
   */
  1: {
    changes: [],
  },
  // 2: {
  //   changes: [ /* Put future migration here */ ],
  // },
};

/**
 * Migrations using legacy upgrade mechanism, do not add to or remove from this map.
 * Future migrations should live in modelVersions map.
 */
export const migrations = {
  '7.9.0': (doc: SavedObjectUnsanitizedDoc<any>): SavedObjectSanitizedDoc<any> => ({
    ...doc,
    ...(doc.attributes && {
      attributes: Object.keys(doc.attributes).reduce(
        (acc, key) =>
          key.startsWith('siem:')
            ? {
                ...acc,
                [key.replace('siem', 'securitySolution')]: doc.attributes[key],
              }
            : {
                ...acc,
                [key]: doc.attributes[key],
              },
        {}
      ),
    }),
    references: doc.references || [],
  }),
  '7.12.0': (doc: SavedObjectUnsanitizedDoc<any>): SavedObjectSanitizedDoc<any> => ({
    ...doc,
    ...(doc.attributes && {
      attributes: Object.keys(doc.attributes).reduce((acc, key) => {
        if (key === 'timepicker:quickRanges' && doc.attributes[key]?.indexOf('section') > -1) {
          const ranges = JSON.parse(doc.attributes[key]).map(
            ({ from, to, display }: { from: string; to: string; display: string }) => {
              return {
                from,
                to,
                display,
              };
            }
          );
          return {
            ...acc,
            'timepicker:quickRanges': JSON.stringify(ranges, null, 2),
          };
        } else {
          return {
            ...acc,
            [key]: doc.attributes[key],
          };
        }
      }, {}),
    }),
    references: doc.references || [],
  }),
  '7.13.0': (doc: SavedObjectUnsanitizedDoc<any>): SavedObjectSanitizedDoc<any> => ({
    ...doc,
    ...(doc.attributes && {
      attributes: Object.keys(doc.attributes).reduce(
        (acc, key) =>
          key === 'ml:fileDataVisualizerMaxFileSize'
            ? {
                ...acc,
                ['fileUpload:maxFileSize']: doc.attributes[key],
              }
            : {
                ...acc,
                [key]: doc.attributes[key],
              },
        {}
      ),
    }),
    references: doc.references || [],
  }),
  '8.0.0': (doc: SavedObjectUnsanitizedDoc<any>): SavedObjectSanitizedDoc<any> => ({
    ...doc,
    ...(doc.attributes && {
      attributes: Object.keys(doc.attributes).reduce(
        (acc, key) =>
          [
            // owner: Team:Geo
            'visualization:regionmap:showWarnings',
            'visualization:tileMap:WMSdefaults',
            'visualization:tileMap:maxPrecision',
            // owner: Team:Core
            'telemetry:optIn',
            'xPackMonitoring:allowReport',
            'theme:version',
            // owner: Team:AppServices
            'courier:batchSearches',
          ].includes(key)
            ? {
                ...acc,
              }
            : {
                ...acc,
                [key]: doc.attributes[key],
              },
        {}
      ),
    }),
    references: doc.references || [],
  }),
  '8.1.0': (doc: SavedObjectUnsanitizedDoc<any>): SavedObjectSanitizedDoc<any> => ({
    ...doc,
    ...(doc.attributes && {
      attributes: Object.keys(doc.attributes).reduce((acc, key) => {
        if (key === 'format:defaultTypeMap') {
          const initial = JSON.parse(doc.attributes[key]);
          const updated = {
            ...initial,
            geo_point: { id: 'geo_point', params: { transform: 'wkt' } },
          };
          return {
            ...acc,
            'format:defaultTypeMap': JSON.stringify(updated, null, 2),
          };
        } else if (key === 'securitySolution:rulesTableRefresh') {
          const initial = JSON.parse(doc.attributes[key]);
          const updated = {
            on: initial.on,
            value: initial.value,
          };
          return {
            ...acc,
            [key]: JSON.stringify(updated, null, 2),
          };
        } else {
          return {
            ...acc,
            [key]: doc.attributes[key],
          };
        }
      }, {}),
    }),
    references: doc.references || [],
  }),
  '8.5.0': (doc: SavedObjectUnsanitizedDoc<any>): SavedObjectSanitizedDoc<any> => ({
    ...doc,
    ...(doc.attributes && {
      attributes: Object.keys(doc.attributes).reduce(
        (acc, key) =>
          [
            // owner: Team:Apm
            'observability:enableInfrastructureView',
          ].includes(key)
            ? {
                ...acc,
              }
            : {
                ...acc,
                [key]: doc.attributes[key],
              },
        {}
      ),
    }),
    references: doc.references || [],
  }),
  '8.7.0': (doc: SavedObjectUnsanitizedDoc<any>): SavedObjectSanitizedDoc<any> => ({
    ...doc,
    ...(doc.attributes && {
      attributes: Object.keys(doc.attributes).reduce(
        (acc, key) =>
          [
            // owner: Team:Uptime
            'observability:enableNewSyntheticsView',
          ].includes(key)
            ? {
                ...acc,
              }
            : {
                ...acc,
                [key]: doc.attributes[key],
              },
        {}
      ),
    }),
    references: doc.references || [],
  }),
  '8.9.0': (doc: SavedObjectUnsanitizedDoc<any>): SavedObjectSanitizedDoc<any> => ({
    ...doc,
    ...(doc.attributes && {
      attributes: Object.keys(doc.attributes).reduce(
        (acc, key) =>
          [
            // owner: Team:Visualizations
            'visualize:enableLabs',
          ].includes(key)
            ? {
                ...acc,
              }
            : {
                ...acc,
                [key]: doc.attributes[key],
              },
        {}
      ),
    }),
    references: doc.references || [],
  }),
};
