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

import { TutorialService, TutorialServiceSetup } from './tutorial_service';

const createSetupMock = (): jest.Mocked<TutorialServiceSetup> => {
  const setup = {
    setVariable: jest.fn(),
    registerDirectoryNotice: jest.fn(),
    registerDirectoryHeaderLink: jest.fn(),
    registerModuleNotice: jest.fn(),
  };
  return setup;
};

const createMock = (): jest.Mocked<PublicMethodsOf<TutorialService>> => {
  const service = {
    setup: jest.fn(),
    getVariables: jest.fn(() => ({})),
    getDirectoryNotices: jest.fn(() => []),
    getDirectoryHeaderLinks: jest.fn(() => []),
    getModuleNotices: jest.fn(() => []),
  };
  service.setup.mockImplementation(createSetupMock);
  return service;
};

export const tutorialServiceMock = {
  createSetup: createSetupMock,
  create: createMock,
};
