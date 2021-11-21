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

import { notificationServiceMock, uiSettingsServiceMock } from '../../../../../core/public/mocks';
import { dataPluginMock } from '../../../../data/public/mocks';
import { FieldEditorProvider, Context } from '../../../public/components/field_editor_context';
import { FieldPreviewProvider } from '../../../public/components/preview';
import { initApi, ApiService } from '../../../public/lib';
import { init as initHttpRequests } from './http_requests';

const mockHttpClient = axios.create({ adapter: axiosXhrAdapter });
const dataStart = dataPluginMock.createStartContract();
const { search, fieldFormats } = dataStart;

export const spySearchQuery = jest.fn();
export const spySearchQueryResponse = jest.fn(() => Promise.resolve({}));
export const spyIndexPatternGetAllFields = jest.fn().mockImplementation(() => []);

let searchResponseDelay = 0;

// Add latency to the search request
export const setSearchResponseLatency = (ms: number) => {
  searchResponseDelay = ms;
};

spySearchQuery.mockImplementation(() => {
  return {
    toPromise: () => {
      if (searchResponseDelay === 0) {
        // no delay, it is synchronous
        return spySearchQueryResponse();
      }

      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(undefined);
        }, searchResponseDelay);
      }).then(() => {
        return spySearchQueryResponse();
      });
    },
  };
});
search.search = spySearchQuery;

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

// The format options available in the dropdown select for our tests.
export const fieldFormatsOptions = [{ id: 'upper', title: 'UpperCaseString' } as any];

export const indexPatternNameForTest = 'testIndexPattern';

export const WithFieldEditorDependencies =
  <T extends object = { [key: string]: unknown }>(
    Comp: FunctionComponent<T>,
    overridingDependencies?: Partial<Context>
  ) =>
  (props: T) => {
    // Setup mocks
    (
      fieldFormats.getByFieldType as jest.MockedFunction<typeof fieldFormats['getByFieldType']>
    ).mockReturnValue(fieldFormatsOptions);

    (
      fieldFormats.getDefaultType as jest.MockedFunction<typeof fieldFormats['getDefaultType']>
    ).mockReturnValue({ id: 'testDefaultFormat', title: 'TestDefaultFormat' } as any);

    (
      fieldFormats.getInstance as jest.MockedFunction<typeof fieldFormats['getInstance']>
    ).mockImplementation((id: string) => {
      if (id === 'upper') {
        return {
          convertObject: {
            html(value: string = '') {
              return `<span>${value.toUpperCase()}</span>`;
            },
          },
        } as any;
      }
    });

    const dependencies: Context = {
      dataView: {
        title: indexPatternNameForTest,
        fields: { getAll: spyIndexPatternGetAllFields },
      } as any,
      uiSettings: uiSettingsServiceMock.createStartContract(),
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
      fieldFormats,
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
