/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as React from 'react';
import { reactToUiComponent } from './react_to_ui_component';

const ReactComp: React.FC<{ cnt?: number }> = ({ cnt = 0 }) => {
  return <div>cnt: {cnt}</div>;
};

describe('reactToUiComponent', () => {
  test('can render UI component', () => {
    const UiComp = reactToUiComponent(ReactComp);
    const div = document.createElement('div');

    const instance = UiComp();
    instance.render(div, {});

    expect(div.innerHTML).toBe('<div>cnt: 0</div>');
  });

  test('can pass in props', async () => {
    const UiComp = reactToUiComponent(ReactComp);
    const div = document.createElement('div');

    const instance = UiComp();
    instance.render(div, { cnt: 5 });

    expect(div.innerHTML).toBe('<div>cnt: 5</div>');
  });

  test('can re-render multiple times', async () => {
    const UiComp = reactToUiComponent(ReactComp);
    const div = document.createElement('div');
    const instance = UiComp();

    instance.render(div, { cnt: 1 });

    expect(div.innerHTML).toBe('<div>cnt: 1</div>');

    instance.render(div, { cnt: 2 });

    expect(div.innerHTML).toBe('<div>cnt: 2</div>');
  });

  test('renders React component only when .render() method is called', () => {
    let renderCnt = 0;
    const MyReactComp: React.FC<{ cnt?: number }> = ({ cnt = 0 }) => {
      renderCnt++;
      return <div>cnt: {cnt}</div>;
    };
    const UiComp = reactToUiComponent(MyReactComp);
    const instance = UiComp();
    const div = document.createElement('div');

    expect(renderCnt).toBe(0);

    instance.render(div, { cnt: 1 });

    expect(renderCnt).toBe(1);

    instance.render(div, { cnt: 2 });

    expect(renderCnt).toBe(2);

    instance.render(div, { cnt: 3 });

    expect(renderCnt).toBe(3);
  });
});
