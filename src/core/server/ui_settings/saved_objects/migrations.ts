/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObjectUnsanitizedDoc, SavedObjectSanitizedDoc } from 'kibana/server';

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
      // owner: Team:Geo
      attributes: Object.keys(doc.attributes).reduce(
        (acc, key) =>
          [
            'visualization:regionmap:showWarnings',
            'visualization:tileMap:WMSdefaults',
            'visualization:tileMap:maxPrecision',
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
