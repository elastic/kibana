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
