/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import './jest.mocks';

import React, { FunctionComponent } from 'react';
import axios from 'axios';
import axiosXhrAdapter from 'axios/lib/adapters/xhr';
import { merge } from 'lodash';

import { notificationServiceMock } from '../../../../../core/public/mocks';
import { dataPluginMock } from '../../../../data/public/mocks';
import { FieldEditorProvider, Context } from '../../../public/components/field_editor_context';
import { FieldPreviewProvider } from '../../../public/components/preview';
import { initApi, ApiService } from '../../../public/lib';
import { init as initHttpRequests } from './http_requests';

const mockHttpClient = axios.create({ adapter: axiosXhrAdapter });
const dataStart = dataPluginMock.createStartContract();
const { search } = dataStart;

export const spySearchResult = jest.fn();

search.search = () =>
  ({
    toPromise: spySearchResult,
  } as any);

let apiService: ApiService;

export const setupEnvironment = () => {
  // @ts-expect-error Axios does not fullfill HttpSetupn from core but enough for our tests
  apiService = initApi(mockHttpClient);
  const { server, httpRequestsMockHelpers } = initHttpRequests();

  return {
    server,
    httpRequestsMockHelpers,
  };
};

export const indexPatternFields = [
  {
    name: 'field1',
    displayName: 'field1',
  },
  {
    name: 'field2',
    displayName: 'field2',
  },
  {
    name: 'field3',
    displayName: 'field3',
  },
];

export const WithFieldEditorDependencies = <T extends object = { [key: string]: unknown }>(
  Comp: FunctionComponent<T>,
  overridingDependencies?: Partial<Context>
) => (props: T) => {
  const dependencies: Context = {
    indexPattern: {
      title: 'testIndexPattern',
      fields: { getAll: () => indexPatternFields },
    } as any,
    uiSettings: {} as any,
    fieldTypeToProcess: 'runtime',
    existingConcreteFields: [],
    namesNotAllowed: [],
    links: {
      runtimePainless: 'https://elastic.co',
    },
    services: {
      notifications: notificationServiceMock.createStartContract(),
      search,
      api: apiService,
    },
    fieldFormatEditors: {
      getAll: () => [],
      getById: () => undefined,
    },
    fieldFormats: {
      getDefaultInstance: () => ({
        convert: (val: any) => val,
      }),
    } as any,
  };

  const mergedDependencies = merge({}, dependencies, overridingDependencies);

  return (
    <FieldEditorProvider {...mergedDependencies}>
      <FieldPreviewProvider>
        <Comp {...props} />
      </FieldPreviewProvider>
    </FieldEditorProvider>
  );
};
