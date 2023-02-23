/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { ComponentMeta, ComponentStory } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { FileKind, BaseFilesClient as FilesClient } from '@kbn/shared-ux-file-types';
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
const getFileKind = (id: string) => (fileKinds as any)[id] as FileKind;

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
} as ComponentMeta<typeof FileUpload>;

const Template: ComponentStory<typeof FileUpload> = (props: Props) => <FileUpload {...props} />;

export const Basic = Template.bind({});

export const AllowRepeatedUploads = Template.bind({});
AllowRepeatedUploads.args = {
  allowRepeatedUploads: true,
};

export const LongErrorUX = Template.bind({});
LongErrorUX.decorators = [
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
];

export const Abort = Template.bind({});
Abort.decorators = [
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
];

export const MaxSize = Template.bind({});
MaxSize.args = {
  kind: miniFile,
};

export const ZipOnly = Template.bind({});
ZipOnly.args = {
  kind: zipOnly,
};

export const AllowClearAfterUpload = Template.bind({});
AllowClearAfterUpload.args = {
  allowClear: true,
};

export const ImmediateUpload = Template.bind({});
ImmediateUpload.args = {
  immediate: true,
};

export const ImmediateUploadError = Template.bind({});
ImmediateUploadError.args = {
  immediate: true,
};
ImmediateUploadError.decorators = [
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
];

export const ImmediateUploadAbort = Template.bind({});
ImmediateUploadAbort.decorators = [
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
];
ImmediateUploadAbort.args = {
  immediate: true,
};

export const Compressed = Template.bind({});
Compressed.args = {
  compressed: true,
};

export const CompressedError = Template.bind({});
CompressedError.args = {
  compressed: true,
};
CompressedError.decorators = [
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
];
