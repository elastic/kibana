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
import { BehaviorSubject } from 'rxjs';
import { Brand, Breadcrumb, ChromeService, ChromeStart } from './chrome_service';

const createStartContractMock = () => {
  const startContract: jest.Mocked<ChromeStart> = {
    setBrand: jest.fn(),
    getBrand$: jest.fn(),
    setIsVisible: jest.fn(),
    getIsVisible$: jest.fn(),
    setIsCollapsed: jest.fn(),
    getIsCollapsed$: jest.fn(),
    addApplicationClass: jest.fn(),
    removeApplicationClass: jest.fn(),
    getApplicationClasses$: jest.fn(),
    getBreadcrumbs$: jest.fn(),
    setBreadcrumbs: jest.fn(),
    getHelpExtension$: jest.fn(),
    setHelpExtension: jest.fn(),
  };
  startContract.getBrand$.mockReturnValue(new BehaviorSubject({} as Brand));
  startContract.getIsVisible$.mockReturnValue(new BehaviorSubject(false));
  startContract.getIsCollapsed$.mockReturnValue(new BehaviorSubject(false));
  startContract.getApplicationClasses$.mockReturnValue(new BehaviorSubject(['class-name']));
  startContract.getBreadcrumbs$.mockReturnValue(new BehaviorSubject([{} as Breadcrumb]));
  startContract.getHelpExtension$.mockReturnValue(new BehaviorSubject(undefined));
  return startContract;
};

type ChromeServiceContract = PublicMethodsOf<ChromeService>;
const createMock = () => {
  const mocked: jest.Mocked<ChromeServiceContract> = {
    start: jest.fn(),
    stop: jest.fn(),
  };
  mocked.start.mockReturnValue(createStartContractMock());
  return mocked;
};

export const chromeServiceMock = {
  create: createMock,
  createStartContract: createStartContractMock,
};
