/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { FileKindBrowser, BaseFilesClient as FilesClient } from '@kbn/shared-ux-file-types';
import { FilesContext } from '@kbn/shared-ux-file-context';

import { FileUpload, Props } from './file_upload';

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

const kind = 'test';
const miniFile = 'miniFile';
const zipOnly = 'zipOnly';
const fileKinds = {
  [kind]: {
    id: kind,
    http: {},
    allowedMimeTypes: ['*'],
  },
  [miniFile]: {
    id: miniFile,
    http: {},
    maxSizeBytes: 1,
    allowedMimeTypes: ['*'],
  },
  [zipOnly]: {
    id: zipOnly,
    http: {},
    allowedMimeTypes: ['application/zip'],
  },
};
const getFileKind = (id: string) => (fileKinds as any)[id] as FileKindBrowser;

const defaultArgs: Props = {
  kind,
  onDone: action('onDone'),
  onError: action('onError'),
};

export default {
  title: 'files/FileUpload',
  component: FileUpload,
  args: defaultArgs,
  decorators: [
    (Story) => (
      <FilesContext
        client={
          {
            create: async () => ({ file: { id: 'test' } }),
            upload: () => sleep(1000),
            getFileKind,
          } as unknown as FilesClient
        }
      >
        <Story />
      </FilesContext>
    ),
  ],
} as Meta<typeof FileUpload>;

export const Basic = {};

export const AllowRepeatedUploads = {
  args: {
    allowRepeatedUploads: true,
  },
};

export const LongErrorUX: StoryObj = {
  decorators: [
    (Story) => (
      <FilesContext
        client={
          {
            create: async () => ({ file: { id: 'test' } }),
            upload: async () => {
              await sleep(1000);
              throw new Error('Something went wrong while uploading! '.repeat(10).trim());
            },
            delete: async () => {},
            getFileKind,
          } as unknown as FilesClient
        }
      >
        <Story />
      </FilesContext>
    ),
  ],
};

export const Abort: StoryObj = {
  decorators: [
    (Story) => (
      <FilesContext
        client={
          {
            create: async () => ({ file: { id: 'test' } }),
            upload: async () => {
              await sleep(60000);
            },
            delete: async () => {},
            getFileKind,
          } as unknown as FilesClient
        }
      >
        <Story />
      </FilesContext>
    ),
  ],
};

export const MaxSize = {
  args: {
    kind: miniFile,
  },
};

export const ZipOnly = {
  args: {
    kind: zipOnly,
  },
};

export const AllowClearAfterUpload = {
  args: {
    allowClear: true,
  },
};

export const ImmediateUpload = {
  args: {
    immediate: true,
  },
};

export const ImmediateUploadError: StoryObj = {
  args: {
    immediate: true,
  },

  decorators: [
    (Story) => (
      <FilesContext
        client={
          {
            create: async () => ({ file: { id: 'test' } }),
            upload: async () => {
              await sleep(1000);
              throw new Error('Something went wrong while uploading!');
            },
            delete: async () => {},
            getFileKind,
          } as unknown as FilesClient
        }
      >
        <Story />
      </FilesContext>
    ),
  ],
};

export const ImmediateUploadAbort: StoryObj = {
  decorators: [
    (Story) => (
      <FilesContext
        client={
          {
            create: async () => ({ file: { id: 'test' } }),
            upload: async () => {
              await sleep(60000);
            },
            delete: async () => {},
            getFileKind,
          } as unknown as FilesClient
        }
      >
        <Story />
      </FilesContext>
    ),
  ],

  args: {
    immediate: true,
  },
};

export const Compressed = {
  args: {
    compressed: true,
  },
};

export const CompressedError: StoryObj = {
  args: {
    compressed: true,
  },

  decorators: [
    (Story) => (
      <FilesContext
        client={
          {
            create: async () => ({ file: { id: 'test' } }),
            upload: async () => {
              await sleep(1000);
              throw new Error('Something went wrong while uploading! '.repeat(10).trim());
            },
            delete: async () => {},
            getFileKind,
          } as unknown as FilesClient
        }
      >
        <Story />
      </FilesContext>
    ),
  ],
};
