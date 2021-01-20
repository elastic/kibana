/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { IIndexPattern } from 'src/plugins/data/public';
import { SavedObjectsClientContract } from 'src/core/public';
import { IndexPatternManagementStart } from '../plugin';

export async function getIndexPatterns(
  savedObjectsClient: SavedObjectsClientContract,
  defaultIndex: string,
  indexPatternManagementStart: IndexPatternManagementStart
) {
  return (
    savedObjectsClient
      .find<IIndexPattern>({
        type: 'index-pattern',
        fields: ['title', 'type'],
        perPage: 10000,
      })
      .then((response) =>
        response.savedObjects
          .map((pattern) => {
            const id = pattern.id;
            const title = pattern.get('title');
            const isDefault = defaultIndex === id;

            const tags = (indexPatternManagementStart as IndexPatternManagementStart).list.getIndexPatternTags(
              pattern,
              isDefault
            );

            return {
              id,
              title,
              default: isDefault,
              tags,
              // the prepending of 0 at the default pattern takes care of prioritization
              // so the sorting will but the default index on top
              // or on bottom of a the table
              sort: `${isDefault ? '0' : '1'}${title}`,
            };
          })
          .sort((a, b) => {
            if (a.sort < b.sort) {
              return -1;
            } else if (a.sort > b.sort) {
              return 1;
            } else {
              return 0;
            }
          })
      ) || []
  );
}
