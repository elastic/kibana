/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getTransforms } from './transforms';

jest.mock('@kbn/presentation-publishing', () => ({
  transformTitlesOut: <T>(state: T) => state,
}));

const identityDrilldownTransforms = {
  transformIn: (state) => ({ state, references: [] }),
  transformOut: (state) => state,
};

describe('transformOut', () => {
  const { transformOut } = getTransforms(identityDrilldownTransforms);

  it('converts camelCase file source state to snake_case', () => {
    const legacy = {
      imageConfig: {
        src: {
          type: 'file',
          fileId: 'abc123',
          fileImageMeta: {
            blurHash: 'LEHV6nWB2yk8',
            width: 800,
            height: 600,
          },
        },
        altText: 'A photo',
        sizing: {
          objectFit: 'cover',
        },
        backgroundColor: '#fff',
      },
    };

    expect(transformOut(legacy)).toEqual({
      image_config: {
        src: {
          type: 'file',
          file_id: 'abc123',
          file_image_meta: {
            blur_hash: 'LEHV6nWB2yk8',
            width: 800,
            height: 600,
          },
        },
        alt_text: 'A photo',
        sizing: {
          object_fit: 'cover',
        },
        background_color: '#fff',
      },
    });
  });

  it('converts camelCase URL source state to snake_case', () => {
    const legacy = {
      imageConfig: {
        src: {
          type: 'url',
          url: 'https://example.com/image.png',
        },
        altText: 'An image',
        sizing: {
          objectFit: 'contain',
        },
      },
    };

    expect(transformOut(legacy)).toEqual({
      image_config: {
        src: {
          type: 'url',
          url: 'https://example.com/image.png',
        },
        alt_text: 'An image',
        sizing: {
          object_fit: 'contain',
        },
      },
    });
  });

  it('leaves already snake_cased state unchanged', () => {
    const current = {
      image_config: {
        src: {
          type: 'file',
          file_id: 'abc123',
          file_image_meta: {
            blur_hash: 'LEHV6nWB2yk8',
            width: 800,
            height: 600,
          },
        },
        alt_text: 'A photo',
        sizing: {
          object_fit: 'cover',
        },
        background_color: '#fff',
      },
    };

    expect(transformOut(current)).toEqual(current);
  });
});
