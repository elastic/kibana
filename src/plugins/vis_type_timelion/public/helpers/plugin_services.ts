/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import type { IndexPatternsContract, ISearchStart } from 'src/plugins/data/public';
import type { SavedObjectsClientContract } from 'kibana/public';
import { createGetterSetter } from '../../../kibana_utils/public';

export const [getIndexPatterns, setIndexPatterns] = createGetterSetter<IndexPatternsContract>(
  'IndexPatterns'
);

export const [getDataSearch, setDataSearch] = createGetterSetter<ISearchStart>('Search');

export const [
  getSavedObjectsClient,
  setSavedObjectsClient,
] = createGetterSetter<SavedObjectsClientContract>('SavedObjectsClient');
