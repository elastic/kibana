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

import {
  FieldEditorProvider,
  Props as FieldEditorProviderProps,
} from '../../../public/components/field_editor_context';
import { initApi, ApiService } from '../../../public/lib';
import { init as initHttpRequests } from './http_requests';

const mockHttpClient = axios.create({ adapter: axiosXhrAdapter });

let apiService: ApiService;

export const setupEnvironment = () => {
  apiService = initApi(mockHttpClient);
  const { server, httpRequestsMockHelpers } = initHttpRequests();

  return {
    server,
    httpRequestsMockHelpers,
  };
};

export const WithFieldEditorDependencies = <T extends object = { [key: string]: unknown }>(
  Comp: FunctionComponent<T>,
  overridingDependencies?: Partial<FieldEditorProviderProps>
) => (props: T) => {
  const dependencies: FieldEditorProviderProps = {
    apiService,
  };

  const mergedDependencies = merge({}, dependencies, overridingDependencies);

  return (
    <FieldEditorProvider {...mergedDependencies}>
      <Comp {...props} />
    </FieldEditorProvider>
  );
};
