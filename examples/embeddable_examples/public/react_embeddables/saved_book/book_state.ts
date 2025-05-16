/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { WithAllKeys } from '@kbn/presentation-publishing';
import { BookAttributes } from './types';

export const defaultBookAttributes: WithAllKeys<BookAttributes> = {
  bookTitle: 'Pillars of the earth',
  authorName: 'Ken follett',
  numberOfPages: 973,
  bookSynopsis:
    'A spellbinding epic set in 12th-century England, The Pillars of the Earth tells the story of the struggle to build the greatest Gothic cathedral the world has known.',
};
