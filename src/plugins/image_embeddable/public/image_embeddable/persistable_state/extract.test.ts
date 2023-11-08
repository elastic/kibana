/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { extract } from './extract';

test('Should return empty references for url image source', () => {
  const imageEmbeddableInput = {
    id: '6301205b-f308-4091-ae24-529d55278272',
    imageConfig: {
      src: {
        type: 'url',
        url: 'https://placehold.co/600x400',
      },
    },
    type: 'image',
  };

  const result = {
    state: {
      id: '6301205b-f308-4091-ae24-529d55278272',
      imageConfig: {
        src: {
          type: 'url',
          url: 'https://placehold.co/600x400',
        },
      },
      type: 'image',
    },
    references: [],
  };

  expect(extract!(imageEmbeddableInput)).toEqual(result);
});

test('Should extract references for file image source', () => {
  const imageEmbeddableInput = {
    id: '6301205b-f308-4091-ae24-529d55278272',
    imageConfig: {
      src: {
        type: 'file',
        fileId: 'cloq41x6b0000ehfc4d8k1eb9',
      },
    },
    type: 'image',
  };

  const result = {
    state: {
      id: '6301205b-f308-4091-ae24-529d55278272',
      imageConfig: {
        src: {
          type: 'file',
          fileId: 'cloq41x6b0000ehfc4d8k1eb9',
        },
      },
      type: 'image',
    },
    references: [
      {
        name: 'image_6301205b-f308-4091-ae24-529d55278272_file',
        type: 'file',
        id: 'cloq41x6b0000ehfc4d8k1eb9',
      },
    ],
  };

  expect(extract!(imageEmbeddableInput)).toEqual(result);
});
