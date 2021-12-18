/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { act } from 'react-dom/test-utils';
import { History, createMemoryHistory } from 'history';
import { IBasePath } from '../../http';
import { BasePath } from '../../http/base_path';
import { ScopedHistory } from '../../application/scoped_history';
import { applicationServiceMock } from '../../application/application_service.mock';

import { renderApp } from './error_application';

describe('renderApp', () => {
  let basePath: IBasePath;
  let element: HTMLDivElement;
  let history: History;
  let unmount: () => void;

  beforeEach(() => {
    basePath = new BasePath();
    element = document.createElement('div');
    history = createMemoryHistory();
    unmount = renderApp(
      applicationServiceMock.createAppMountParameters({
        element,
        history: new ScopedHistory(history, '/'),
      }),
      {
        basePath,
      }
    );
  });

  afterEach(() => unmount());

  it('renders generic errors', () => {
    act(() => {
      history.push('/app/error');
    });
    // innerText not working in jsdom, so use innerHTML
    expect(element.querySelector('.euiTitle')!.innerHTML).toMatchInlineSnapshot(
      `"Application error"`
    );
  });

  it('renders urlOverflow errors', () => {
    act(() => {
      history.push('/app/error?errorType=urlOverflow');
    });
    expect(element.querySelector('.euiTitle')!.innerHTML).toMatchInlineSnapshot(
      `"The URL for this object is too long, and we can't display it"`
    );
    expect(element.innerHTML).toMatch('Things to try');
  });
});
