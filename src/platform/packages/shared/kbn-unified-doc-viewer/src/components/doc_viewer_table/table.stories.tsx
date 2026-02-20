/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Meta, StoryObj } from '@storybook/react';
import type { DocViewRenderProps, UnifiedDocViewerServices } from '@kbn/unified-doc-viewer/types';
import { DocViewerTable } from './table';
import APMSpanFixture from '../../__fixtures__/span_apm';
import { buildDataTableRecord, type EsHitRecord } from '@kbn/discover-utils';
import { fieldFormatsServiceMock } from '@kbn/field-formats-plugin/public/mocks';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { createStubDataView } from '@kbn/data-views-plugin/common/data_view.stub';
import type { CoreStart } from '@kbn/core-lifecycle-browser';

type Args = DocViewRenderProps & { services: UnifiedDocViewerServices };
const meta = {
  title: 'Doc viewers/Table',
  component: DocViewerTable,
} satisfies Meta<typeof DocViewerTable>;

export default meta;
type Story = StoryObj<Args>;

const coreStart = { docLinks: { links: {} } } as unknown as Pick<CoreStart, 'docLinks'>;
const uiSettings = {
  get: (_key: string, defaultValue?: unknown) => defaultValue,
} as unknown as CoreStart['uiSettings'];
const toasts = {
  addInfo: () => undefined,
  addWarning: () => undefined,
} as unknown as CoreStart['notifications']['toasts'];
const unifiedDocViewerServices: UnifiedDocViewerServices = {
  core: coreStart,
  uiSettings,
  storage: new Storage(window.localStorage),
  fieldFormats: fieldFormatsServiceMock.createStartContract(),
  toasts,
};

const dataView = createStubDataView({
  spec: {
    id: 'storybook-apm-span',
    title: 'storybook-apm-span',
    timeFieldName: '@timestamp',
    fields: {
      '@timestamp': {
        name: '@timestamp',
        type: 'date',
        esTypes: ['date'],
        searchable: true,
        aggregatable: true,
        readFromDocValues: true,
      },
      message: {
        name: 'message',
        type: 'string',
        esTypes: ['text'],
        searchable: true,
        aggregatable: false,
        readFromDocValues: false,
      },
    },
  },
});

const hit = buildDataTableRecord(APMSpanFixture as unknown as EsHitRecord, dataView);

export const Basic: Story = {
  args: {
    services: unifiedDocViewerServices,
    hit,
    dataView,
    columns: [],
    columnsMeta: {},
    filter: () => {},
    onAddColumn: () => {},
    onRemoveColumn: () => {},
    textBasedHits: undefined,
    decreaseAvailableHeightBy: 0,
  },
};
