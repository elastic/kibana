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
import type { FileJSON } from '../../../common';
import { FilesClient, FilesClientResponses } from '../../types';
import { register } from '../stories_shared';
import { base64dLogo } from '../image/image.constants.stories';
import { FilesContext } from '../context';
import { FilePicker, Props as FilePickerProps } from './file_picker';

const kind = 'filepicker';
register({
  id: kind,
  http: {},
  allowedMimeTypes: ['*'],
});

const defaultProps: FilePickerProps = {
  kind,
  onDone: action('done!'),
  onClose: action('close!'),
};

export default {
  title: 'components/FilePicker',
  component: FilePicker,
  args: defaultProps,
  decorators: [
    (Story) => (
      <FilesContext
        client={
          {
            create: () => Promise.reject(new Error('not so fast buster!')),
            list: async (): Promise<FilesClientResponses['list']> => ({
              files: [],
              total: 0,
            }),
          } as unknown as FilesClient
        }
      >
        <Story />
      </FilesContext>
    ),
  ],
} as ComponentMeta<typeof FilePicker>;

const Template: ComponentStory<typeof FilePicker> = (props) => <FilePicker {...props} />;

export const Empty = Template.bind({});

const d = new Date();
let id = 0;
function createFileJSON(file?: Partial<FileJSON>): FileJSON {
  return {
    alt: '',
    created: d.toISOString(),
    updated: d.toISOString(),
    extension: 'png',
    fileKind: kind,
    id: String(++id),
    meta: {
      width: 1000,
      height: 1000,
    },
    mimeType: 'image/png',
    name: 'my file',
    size: 1,
    status: 'READY',
    ...file,
  };
}
export const BasicOne = Template.bind({});
BasicOne.decorators = [
  (Story) => (
    <FilesContext
      client={
        {
          getDownloadHref: () => `data:image/png;base64,${base64dLogo}`,
          list: async (): Promise<FilesClientResponses['list']> => ({
            files: [createFileJSON()],
            total: 1,
          }),
        } as unknown as FilesClient
      }
    >
      <Story />
    </FilesContext>
  ),
];

export const BasicMany = Template.bind({});
BasicMany.decorators = [
  (Story) => {
    const files = [
      createFileJSON({ name: 'abc' }),
      createFileJSON({ name: 'def' }),
      createFileJSON({ name: 'efg' }),
      createFileJSON({ name: 'foo' }),
      createFileJSON({ name: 'bar' }),
      createFileJSON(),
      createFileJSON(),
    ];

    return (
      <FilesContext
        client={
          {
            getDownloadHref: () => `data:image/png;base64,${base64dLogo}`,
            list: async (): Promise<FilesClientResponses['list']> => ({
              files,
              total: files.length,
            }),
          } as unknown as FilesClient
        }
      >
        <Story />
      </FilesContext>
    );
  },
];

export const BasicManyMany = Template.bind({});
BasicManyMany.decorators = [
  (Story) => {
    const array = new Array(102);
    array.fill(null);
    return (
      <FilesContext
        client={
          {
            getDownloadHref: () => `data:image/png;base64,${base64dLogo}`,
            list: async (): Promise<FilesClientResponses['list']> => ({
              files: array.map((_, idx) => createFileJSON({ id: String(idx) })),
              total: array.length,
            }),
          } as unknown as FilesClient
        }
      >
        <Story />
      </FilesContext>
    );
  },
];

export const ErrorLoading = Template.bind({});
ErrorLoading.decorators = [
  (Story) => {
    const array = new Array(102);
    array.fill(createFileJSON());
    return (
      <FilesContext
        client={
          {
            getDownloadHref: () => `data:image/png;base64,${base64dLogo}`,
            list: async () => {
              throw new Error('stop');
            },
          } as unknown as FilesClient
        }
      >
        <Story />
      </FilesContext>
    );
  },
];

export const TryFilter = Template.bind({});
TryFilter.decorators = [
  (Story) => {
    const array = { files: [createFileJSON()], total: 1 };
    return (
      <>
        <h2>Try entering a filter!</h2>
        <FilesContext
          client={
            {
              getDownloadHref: () => `data:image/png;base64,${base64dLogo}`,
              list: async ({ name }: { name: string[] }) => {
                if (name) {
                  return { files: [], total: 0 };
                }
                return array;
              },
            } as unknown as FilesClient
          }
        >
          <Story />
        </FilesContext>
      </>
    );
  },
];
