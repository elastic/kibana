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
import {
  ChromeBadge,
  ChromeBrand,
  ChromeBreadcrumb,
  ChromeService,
  ChromeStart,
} from './chrome_service';

const createStartContractMock = () => {
  const setupContract: jest.Mocked<ChromeStart> = {
    navLinks: {
      getNavLinks$: jest.fn(),
      has: jest.fn(),
      get: jest.fn(),
      getAll: jest.fn(),
      showOnly: jest.fn(),
      update: jest.fn(),
      enableForcedAppSwitcherNavigation: jest.fn(),
      getForceAppSwitcherNavigation$: jest.fn(),
    },
    setBrand: jest.fn(),
    getBrand$: jest.fn(),
    setIsVisible: jest.fn(),
    getIsVisible$: jest.fn(),
    setIsCollapsed: jest.fn(),
    getIsCollapsed$: jest.fn(),
    addApplicationClass: jest.fn(),
    removeApplicationClass: jest.fn(),
    getApplicationClasses$: jest.fn(),
    getBadge$: jest.fn(),
    setBadge: jest.fn(),
    getBreadcrumbs$: jest.fn(),
    setBreadcrumbs: jest.fn(),
    getHelpExtension$: jest.fn(),
    setHelpExtension: jest.fn(),
  };
  setupContract.getBrand$.mockReturnValue(new BehaviorSubject({} as ChromeBrand));
  setupContract.getIsVisible$.mockReturnValue(new BehaviorSubject(false));
  setupContract.getIsCollapsed$.mockReturnValue(new BehaviorSubject(false));
  setupContract.getApplicationClasses$.mockReturnValue(new BehaviorSubject(['class-name']));
  setupContract.getBadge$.mockReturnValue(new BehaviorSubject({} as ChromeBadge));
  setupContract.getBreadcrumbs$.mockReturnValue(new BehaviorSubject([{} as ChromeBreadcrumb]));
  setupContract.getHelpExtension$.mockReturnValue(new BehaviorSubject(undefined));
  return setupContract;
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
