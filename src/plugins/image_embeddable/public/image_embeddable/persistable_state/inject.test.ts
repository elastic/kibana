/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Reference } from '@kbn/content-management-utils';
import { inject } from './inject';

test('Should return original state without references', () => {
  const state = {
    id: '6301205b-f308-4091-ae24-529d55278272',
    imageConfig: {
      src: {
        type: 'url',
        url: 'https://elastic.co',
      },
    },
    type: 'image',
  };
  const references = [] as Reference[];

  expect(inject!(state, references)).toEqual(state);
});

test('Should update state with file reference', () => {
  const state = {
    id: '6301205b-f308-4091-ae24-529d55278272',
    imageConfig: {
      src: {
        type: 'file',
        fileId: 'cloq41x6b0000ehfc4d8k1eb9',
      },
    },
    type: 'image',
  };
  const references = [
    {
      name: 'image_6301205b-f308-4091-ae24-529d55278272_file',
      type: 'file',
      id: 'cloq41x6b0000ehfc4d8k1eb9',
    },
  ];

  const result = {
    id: '6301205b-f308-4091-ae24-529d55278272',
    imageConfig: {
      src: {
        type: 'file',
        fileId: 'cloq41x6b0000ehfc4d8k1eb9',
      },
    },
    type: 'image',
  };

  expect(inject!(state, references)).toEqual(result);
});
