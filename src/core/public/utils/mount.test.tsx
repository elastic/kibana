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

import React from 'react';
import { mount } from 'enzyme';
import { MountWrapper, mountReactNode } from './mount';

describe('MountWrapper', () => {
  it('renders an html element in react tree', () => {
    const mountPoint = (container: HTMLElement) => {
      const el = document.createElement('p');
      el.textContent = 'hello';
      el.className = 'bar';
      container.append(el);
      return () => {};
    };
    const wrapper = <MountWrapper mount={mountPoint} />;
    const container = mount(wrapper);
    expect(container.html()).toMatchInlineSnapshot(
      `"<div class=\\"kbnMountWrapper\\"><p class=\\"bar\\">hello</p></div>"`
    );
  });

  it('updates the react tree when the mounted element changes', () => {
    const el = document.createElement('p');
    el.textContent = 'initial';

    const mountPoint = (container: HTMLElement) => {
      container.append(el);
      return () => {};
    };

    const wrapper = <MountWrapper mount={mountPoint} />;
    const container = mount(wrapper);
    expect(container.html()).toMatchInlineSnapshot(
      `"<div class=\\"kbnMountWrapper\\"><p>initial</p></div>"`
    );

    el.textContent = 'changed';
    container.update();
    expect(container.html()).toMatchInlineSnapshot(
      `"<div class=\\"kbnMountWrapper\\"><p>changed</p></div>"`
    );
  });

  it('can render a detached react component', () => {
    const mountPoint = mountReactNode(<span>detached</span>);
    const wrapper = <MountWrapper mount={mountPoint} />;
    const container = mount(wrapper);
    expect(container.html()).toMatchInlineSnapshot(
      `"<div class=\\"kbnMountWrapper\\"><span>detached</span></div>"`
    );
  });

  it('accepts a className prop to override default className', () => {
    const mountPoint = mountReactNode(<span>detached</span>);
    const wrapper = <MountWrapper mount={mountPoint} className="customClass" />;
    const container = mount(wrapper);
    expect(container.html()).toMatchInlineSnapshot(
      `"<div class=\\"customClass\\"><span>detached</span></div>"`
    );
  });
});
