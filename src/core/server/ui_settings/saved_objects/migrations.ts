/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
};
