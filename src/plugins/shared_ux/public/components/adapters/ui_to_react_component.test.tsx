/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { UiComponent } from '../../ui';
import { uiToReactComponent } from './ui_to_react_component';
import { reactToUiComponent } from './react_to_ui_component';

const UiComp: UiComponent<{ cnt?: number }> = () => ({
  render: (el, { cnt = 0 }) => {
    // eslint-disable-next-line no-unsanitized/property
    el.innerHTML = `cnt: ${cnt}`;
  },
});

describe('uiToReactComponent', () => {
  test('can render React component', () => {
    const ReactComp = uiToReactComponent(UiComp);
    const div = document.createElement('div');

    ReactDOM.render(<ReactComp />, div);

    expect(div.innerHTML).toBe('<div>cnt: 0</div>');
  });

  test('can pass in props', async () => {
    const ReactComp = uiToReactComponent(UiComp);
    const div = document.createElement('div');

    ReactDOM.render(<ReactComp cnt={5} />, div);

    expect(div.innerHTML).toBe('<div>cnt: 5</div>');
  });

  test('re-renders when React component is re-rendered', async () => {
    const ReactComp = uiToReactComponent(UiComp);
    const div = document.createElement('div');

    ReactDOM.render(<ReactComp cnt={1} />, div);

    expect(div.innerHTML).toBe('<div>cnt: 1</div>');

    ReactDOM.render(<ReactComp cnt={2} />, div);

    expect(div.innerHTML).toBe('<div>cnt: 2</div>');
  });

  test('does not crash if .unmount() not provided', () => {
    const UiComp2: UiComponent<{ cnt?: number }> = () => ({
      render: (el, { cnt = 0 }) => {
        // eslint-disable-next-line no-unsanitized/property
        el.innerHTML = `cnt: ${cnt}`;
      },
    });
    const ReactComp = uiToReactComponent(UiComp2);
    const div = document.createElement('div');

    ReactDOM.render(<ReactComp cnt={1} />, div);
    ReactDOM.unmountComponentAtNode(div);

    expect(div.innerHTML).toBe('');
  });

  test('calls .unmount() method once when component un-mounts', () => {
    const unmount = jest.fn();
    const UiComp2: UiComponent<{ cnt?: number }> = () => ({
      render: (el, { cnt = 0 }) => {
        // eslint-disable-next-line no-unsanitized/property
        el.innerHTML = `cnt: ${cnt}`;
      },
      unmount,
    });
    const ReactComp = uiToReactComponent(UiComp2);
    const div = document.createElement('div');

    expect(unmount).toHaveBeenCalledTimes(0);

    ReactDOM.render(<ReactComp cnt={1} />, div);

    expect(unmount).toHaveBeenCalledTimes(0);

    ReactDOM.unmountComponentAtNode(div);

    expect(unmount).toHaveBeenCalledTimes(1);
  });

  test('calls .render() method only once when components mounts, and once on every re-render', () => {
    const render = jest.fn((el, { cnt = 0 }) => {
      // eslint-disable-next-line no-unsanitized/property
      el.innerHTML = `cnt: ${cnt}`;
    });
    const UiComp2: UiComponent<{ cnt?: number }> = () => ({
      render,
    });
    const ReactComp = uiToReactComponent(UiComp2);
    const div = document.createElement('div');

    expect(render).toHaveBeenCalledTimes(0);

    ReactDOM.render(<ReactComp cnt={1} />, div);

    expect(render).toHaveBeenCalledTimes(1);

    ReactDOM.render(<ReactComp cnt={2} />, div);

    expect(render).toHaveBeenCalledTimes(2);

    ReactDOM.render(<ReactComp cnt={3} />, div);

    expect(render).toHaveBeenCalledTimes(3);
  });

  test('can specify wrapper element', async () => {
    const ReactComp = uiToReactComponent(UiComp, 'span');
    const div = document.createElement('div');

    ReactDOM.render(<ReactComp cnt={5} />, div);

    expect(div.innerHTML).toBe('<span>cnt: 5</span>');
  });
});

test('can adapt component many times', () => {
  const ReactComp = uiToReactComponent(
    reactToUiComponent(uiToReactComponent(reactToUiComponent(uiToReactComponent(UiComp))))
  );
  const div = document.createElement('div');

  ReactDOM.render(<ReactComp />, div);

  expect(div.textContent).toBe('cnt: 0');

  ReactDOM.render(<ReactComp cnt={123} />, div);

  expect(div.textContent).toBe('cnt: 123');
});
