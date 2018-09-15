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

import { unmountComponentAtNode } from 'react-dom';
import { BannersService } from './banners_service';

describe('start.add()', () => {
  it('renders the component in the targetDomElement', () => {
    const targetDomElement = document.createElement('div');
    const start = new BannersService({ targetDomElement }).start();
    start.add('foo');
    expect(targetDomElement).toMatchInlineSnapshot(`
<div>
  <div
    class="globalBanner__list"
  >
    <div
      class="globalBanner__item"
    >
      foo
    </div>
  </div>
</div>
`);
  });

  it('renders higher-priority banners abover lower-priority ones', () => {
    const targetDomElement = document.createElement('div');
    const start = new BannersService({ targetDomElement }).start();
    start.add('100', 100);
    start.add('1', 1);
    start.add('200', 200);
    expect(targetDomElement).toMatchInlineSnapshot(`
<div>
  <div
    class="globalBanner__list"
  >
    <div
      class="globalBanner__item"
    >
      200
    </div>
    <div
      class="globalBanner__item"
    >
      100
    </div>
    <div
      class="globalBanner__item"
    >
      1
    </div>
  </div>
</div>
`);
  });
});

describe('start.remove()', () => {
  it('removes the component from the targetDomElement', () => {
    const targetDomElement = document.createElement('div');
    const start = new BannersService({ targetDomElement }).start();
    const id = start.add('foo');
    start.remove(id);
    expect(targetDomElement).toMatchInlineSnapshot(`<div />`);
  });

  it('does nothing if the id is unknown', () => {
    const targetDomElement = document.createElement('div');
    const start = new BannersService({ targetDomElement }).start();
    start.add('foo');
    start.remove('something random');
    expect(targetDomElement).toMatchInlineSnapshot(`
<div>
  <div
    class="globalBanner__list"
  >
    <div
      class="globalBanner__item"
    >
      foo
    </div>
  </div>
</div>
`);
  });
});

describe('start.replace()', () => {
  it('replaces the banner with the matching id', () => {
    const targetDomElement = document.createElement('div');
    const start = new BannersService({ targetDomElement }).start();
    const id = start.add('foo');
    start.replace(id, 'bar');
    expect(targetDomElement).toMatchInlineSnapshot(`
<div>
  <div
    class="globalBanner__list"
  >
    <div
      class="globalBanner__item"
    >
      bar
    </div>
  </div>
</div>
`);
  });

  it('adds the banner if the id is unknown', () => {
    const targetDomElement = document.createElement('div');
    const start = new BannersService({ targetDomElement }).start();
    start.add('foo');
    start.replace('something random', 'bar');
    expect(targetDomElement).toMatchInlineSnapshot(`
<div>
  <div
    class="globalBanner__list"
  >
    <div
      class="globalBanner__item"
    >
      foo
    </div>
    <div
      class="globalBanner__item"
    >
      bar
    </div>
  </div>
</div>
`);
  });
});

describe('stop', () => {
  it('unmounts the component from the targetDomElement', () => {
    const targetDomElement = document.createElement('div');
    const service = new BannersService({ targetDomElement });
    service.start();
    service.stop();
    expect(unmountComponentAtNode(targetDomElement)).toBe(false);
  });

  it('cleans out the content of the targetDomElement', () => {
    const targetDomElement = document.createElement('div');
    const service = new BannersService({ targetDomElement });
    service.start().add('foo-bar');
    service.stop();
    expect(targetDomElement).toMatchInlineSnapshot(`<div />`);
  });
});
