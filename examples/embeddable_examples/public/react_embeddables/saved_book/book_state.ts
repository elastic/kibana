/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { WithAllKeys } from '@kbn/presentation-publishing';
import { BookAttributesV1, BookAttributesV2, BookAttributesV3 } from './types';

const defaultBookAttributesV1: WithAllKeys<BookAttributesV1> = {
  bookTitle: 'Pillars of the earth',
  authorName: 'Ken follett',
  numberOfPages: 973,
  bookSynopsis:
    'A spellbinding epic set in 12th-century England, The Pillars of the Earth tells the story of the struggle to build the greatest Gothic cathedral the world has known.',
};

const defaultBookAttributesV2: WithAllKeys<BookAttributesV2> = {
  bookTitle: 'Pillars of the earth',
  author: 'Ken follett',
  numberOfPages: 973,
  synopsis:
    'A spellbinding epic set in 12th-century England, The Pillars of the Earth tells the story of the struggle to build the greatest Gothic cathedral the world has known.',
  publicationYear: 1989,
};

const defaultBookAttributesV3: WithAllKeys<BookAttributesV3> = {
  bookTitle: 'Pillars of the earth',
  author: 'Ken follett',
  pages: 973,
  synopsis:
    'A spellbinding epic set in 12th-century England, The Pillars of the Earth tells the story of the struggle to build the greatest Gothic cathedral the world has known.',
  published: 1989,
};

export const defaultBookAttributes: Record<
  number,
  WithAllKeys<BookAttributesV1> | WithAllKeys<BookAttributesV2> | WithAllKeys<BookAttributesV3>
> = {
  1: defaultBookAttributesV1,
  2: defaultBookAttributesV2,
  3: defaultBookAttributesV3,
};
