/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { StoryFn, Meta } from '@storybook/react';

import { getImageMetadata } from '@kbn/shared-ux-file-util';
import { getImageData as getBlob, base64dLogo } from '@kbn/shared-ux-file-image-mocks';
import { Image, Props } from './image';

const defaultArgs: Props = { alt: 'test', src: `data:image/png;base64,${base64dLogo}` };

export default {
  title: 'files/Image',
  component: Image,
  args: defaultArgs,
  decorators: [
    (Story) => {
      React.useLayoutEffect(() => {
        // @ts-ignore
        window.__image_stories_simulate_slow_load = true;
        return () => {
          // @ts-ignore
          window.__image_stories_simulate_slow_load = false;
        };
      }, []);

      return (
        <>
          <Story />
        </>
      );
    },
  ],
} as Meta<typeof Image>;

const Template: StoryFn<typeof Image> = (props: Props, { loaded: { meta } }) => (
  <Image {...props} meta={meta} />
);

export const Basic = {
  render: Template,
};

export const WithBlurhash = {
  render: Template,
  name: 'With blurhash',

  loaders: [
    async () => ({
      meta: await getImageMetadata(getBlob()),
    }),
  ],
};

export const BrokenSrc = {
  render: Template,
  name: 'Broken src',

  args: {
    src: 'foo',
  },
};

export const WithBlurhashAndBrokenSrc = {
  render: Template,
  name: 'With blurhash and broken src',

  args: {
    src: 'foo',
  },

  loaders: [
    async () => ({
      blurhash: await getImageMetadata(getBlob()),
    }),
  ],
};

export const WithCustomSizing = {
  render: Template,
  name: 'With custom sizing',

  loaders: [
    async () => ({
      meta: await getImageMetadata(getBlob()),
    }),
  ],

  args: {
    css: `width: 100px; height: 500px; object-fit: fill`,
  },
};
