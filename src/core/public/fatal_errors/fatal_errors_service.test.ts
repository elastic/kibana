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

import * as Rx from 'rxjs';

expect.addSnapshotSerializer({
  test: val => val instanceof Rx.Observable,
  print: () => `Rx.Observable`,
});

import { mockRender } from './fatal_errors_service.test.mocks';

import { FatalErrorsService } from './fatal_errors_service';

function setupService() {
  const rootDomElement = document.createElement('div');

  const injectedMetadata = {
    getKibanaBuildNumber: jest.fn().mockReturnValue('kibanaBuildNumber'),
    getKibanaVersion: jest.fn().mockReturnValue('kibanaVersion'),
  };

  const stopCoreSystem = jest.fn();

  const i18n: any = {
    Context: function I18nContext() {
      return '';
    },
  };

  return {
    rootDomElement,
    injectedMetadata,
    i18n,
    stopCoreSystem,
    fatalErrors: new FatalErrorsService({
      injectedMetadata: injectedMetadata as any,
      rootDomElement,
      stopCoreSystem,
    }),
  };
}

afterEach(() => {
  jest.resetAllMocks();
});

describe('#add()', () => {
  it('calls stopCoreSystem() param', () => {
    const { stopCoreSystem, fatalErrors } = setupService();

    expect(stopCoreSystem).not.toHaveBeenCalled();
    expect(() => {
      fatalErrors.add(new Error('foo'));
    }).toThrowError();
    expect(stopCoreSystem).toHaveBeenCalled();
    expect(stopCoreSystem).toHaveBeenCalledWith();
  });

  it('deletes all children of rootDomElement and renders <FatalErrorScreen /> into it', () => {
    const { fatalErrors, rootDomElement } = setupService();

    rootDomElement.innerHTML = `
      <h1>Loading...</h1>
      <div class="someSpinner"></div>
    `;

    expect(mockRender).not.toHaveBeenCalled();
    expect(rootDomElement.children).toHaveLength(2);
    expect(() => {
      fatalErrors.add(new Error('foo'));
    }).toThrowError();
    expect(rootDomElement).toMatchSnapshot('fatal error screen container');
    expect(mockRender.mock.calls).toMatchSnapshot('fatal error screen component');
  });
});

describe('setup.add()', () => {
  it('exposes a function that passes its two arguments to fatalErrors.add()', () => {
    const { fatalErrors, i18n } = setupService();

    jest.spyOn(fatalErrors, 'add').mockImplementation(() => undefined as never);

    expect(fatalErrors.add).not.toHaveBeenCalled();
    const { add } = fatalErrors.setup({ i18n });
    add('foo', 'bar');
    expect(fatalErrors.add).toHaveBeenCalledTimes(1);
    expect(fatalErrors.add).toHaveBeenCalledWith('foo', 'bar');
  });

  it('deletes all children of rootDomElement and renders <FatalErrorScreen /> into it', () => {
    const { fatalErrors, i18n, rootDomElement } = setupService();

    rootDomElement.innerHTML = `
      <h1>Loading...</h1>
      <div class="someSpinner"></div>
    `;

    expect(mockRender).not.toHaveBeenCalled();
    expect(rootDomElement.children).toHaveLength(2);

    const { add } = fatalErrors.setup({ i18n });

    expect(() => add(new Error('foo'))).toThrowError();
    expect(rootDomElement).toMatchSnapshot('fatal error screen container');
    expect(mockRender.mock.calls).toMatchSnapshot('fatal error screen component');
  });
});

describe('setup.get$()', () => {
  it('provides info about the errors passed to fatalErrors.add()', () => {
    const { fatalErrors, i18n } = setupService();

    const setup = fatalErrors.setup({ i18n });

    const onError = jest.fn();
    setup.get$().subscribe(onError);

    expect(onError).not.toHaveBeenCalled();
    expect(() => {
      fatalErrors.add(new Error('bar'));
    }).toThrowError();

    expect(onError).toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith({
      message: 'bar',
      stack: expect.stringMatching(/Error: bar[\w\W]+fatal_errors_service\.test\.ts/),
    });
  });
});
