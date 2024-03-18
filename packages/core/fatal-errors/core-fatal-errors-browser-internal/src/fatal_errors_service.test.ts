/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Observable } from 'rxjs';

expect.addSnapshotSerializer({
  test: (val) => val instanceof Observable,
  print: () => `Rx.Observable`,
});

import { analyticsServiceMock } from '@kbn/core-analytics-browser-mocks';
import { mockRender } from './fatal_errors_service.test.mocks';
import { injectedMetadataServiceMock } from '@kbn/core-injected-metadata-browser-mocks';
import { themeServiceMock } from '@kbn/core-theme-browser-mocks';

import { FatalErrorsService } from './fatal_errors_service';

function setupService() {
  const rootDomElement = document.createElement('div');

  const analytics = analyticsServiceMock.createAnalyticsServiceStart();
  const injectedMetadata = injectedMetadataServiceMock.createSetupContract();
  const theme = themeServiceMock.createSetupContract();

  const stopCoreSystem = jest.fn();

  const i18n: any = {
    Context: function I18nContext() {
      return '';
    },
  };

  const fatalErrorsService = new FatalErrorsService(rootDomElement, stopCoreSystem);

  return {
    rootDomElement,
    injectedMetadata,
    stopCoreSystem,
    fatalErrors: fatalErrorsService.setup({ analytics, injectedMetadata, i18n, theme }),
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

describe('setup.get$()', () => {
  it('provides info about the errors passed to fatalErrors.add()', () => {
    const { fatalErrors } = setupService();

    const onError = jest.fn();
    fatalErrors.get$().subscribe(onError);

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
