/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React from 'react';
import { I18nService, I18nStart } from './i18n_service';

const PassThroughComponent = ({ children }: { children: React.ReactNode }) => children;

const createStartContractMock = () => {
  const setupContract: jest.Mocked<I18nStart> = {
    // By default mock the Context component so it simply renders all children
    Context: jest.fn().mockImplementation(PassThroughComponent),
  };
  return setupContract;
};

type I18nServiceContract = PublicMethodsOf<I18nService>;
const createMock = () => {
  const mocked: jest.Mocked<I18nServiceContract> = {
    getContext: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
  };
  mocked.getContext.mockReturnValue(createStartContractMock());
  mocked.start.mockReturnValue(createStartContractMock());
  return mocked;
};

export const i18nServiceMock = {
  create: createMock,
  createStartContract: createStartContractMock,
};
