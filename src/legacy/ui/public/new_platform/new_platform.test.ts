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

import { setRootControllerMock } from './new_platform.test.mocks';
import { legacyAppRegister, __reset__, __setup__ } from './new_platform';
import { coreMock } from '../../../../core/public/mocks';

describe('ui/new_platform', () => {
  describe('legacyAppRegister', () => {
    beforeEach(() => {
      setRootControllerMock.mockReset();
      __reset__();
      __setup__(coreMock.createSetup({ basePath: '/test/base/path' }) as any, {} as any);
    });

    const registerApp = () => {
      const unmountMock = jest.fn();
      const mountMock = jest.fn(() => unmountMock);
      legacyAppRegister({
        id: 'test',
        title: 'Test',
        mount: mountMock,
      });
      return { mountMock, unmountMock };
    };

    test('sets ui/chrome root controller', () => {
      registerApp();
      expect(setRootControllerMock).toHaveBeenCalledWith('test', expect.any(Function));
    });

    test('throws if called more than once', () => {
      registerApp();
      expect(registerApp).toThrowErrorMatchingInlineSnapshot(
        `"core.application.register may only be called once for legacy plugins."`
      );
    });

    test('controller calls app.mount when invoked', () => {
      const { mountMock } = registerApp();
      const controller = setRootControllerMock.mock.calls[0][1];
      const scopeMock = { $on: jest.fn() };
      const elementMock = [document.createElement('div')];

      controller(scopeMock, elementMock);
      expect(mountMock).toHaveBeenCalledWith({
        element: elementMock[0],
        appBasePath: '/test/base/path/app/test',
      });
    });

    test('controller calls deprecated context app.mount when invoked', () => {
      const unmountMock = jest.fn();
      // Two arguments changes how this is called.
      const mountMock = jest.fn((context, params) => unmountMock);
      legacyAppRegister({
        id: 'test',
        title: 'Test',
        mount: mountMock,
      });
      const controller = setRootControllerMock.mock.calls[0][1];
      const scopeMock = { $on: jest.fn() };
      const elementMock = [document.createElement('div')];

      controller(scopeMock, elementMock);
      expect(mountMock).toHaveBeenCalledWith(expect.any(Object), {
        element: elementMock[0],
        appBasePath: '/test/base/path/app/test',
      });
    });

    test('controller calls unmount when $scope.$destroy', async () => {
      const { unmountMock } = registerApp();
      const controller = setRootControllerMock.mock.calls[0][1];
      const scopeMock = { $on: jest.fn() };
      const elementMock = [document.createElement('div')];

      controller(scopeMock, elementMock);
      // Flush promise queue. Must be done this way because the controller cannot return a Promise without breaking
      // angular.
      await new Promise(resolve => setTimeout(resolve, 1));

      const [event, eventHandler] = scopeMock.$on.mock.calls[0];
      expect(event).toEqual('$destroy');
      eventHandler();
      expect(unmountMock).toHaveBeenCalled();
    });
  });
});
