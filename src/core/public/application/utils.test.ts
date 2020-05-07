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

import {
  removeSlashes,
  appendAppPath,
  isLegacyApp,
  relativeToAbsolute,
  getOrigin,
  selfOrParentMatch,
} from './utils';

describe('removeSlashes', () => {
  it('only removes duplicates by default', () => {
    expect(removeSlashes('/some//url//to//')).toEqual('/some/url/to/');
    expect(removeSlashes('some/////other//url')).toEqual('some/other/url');
  });

  it('remove trailing slash when `trailing` is true', () => {
    expect(removeSlashes('/some//url//to//', { trailing: true })).toEqual('/some/url/to');
  });

  it('remove leading slash when `leading` is true', () => {
    expect(removeSlashes('/some//url//to//', { leading: true })).toEqual('some/url/to/');
  });

  it('does not removes duplicates when `duplicates` is false', () => {
    expect(removeSlashes('/some//url//to/', { leading: true, duplicates: false })).toEqual(
      'some//url//to/'
    );
    expect(removeSlashes('/some//url//to/', { trailing: true, duplicates: false })).toEqual(
      '/some//url//to'
    );
  });

  it('accept mixed options', () => {
    expect(
      removeSlashes('/some//url//to/', { leading: true, duplicates: false, trailing: true })
    ).toEqual('some//url//to');
    expect(
      removeSlashes('/some//url//to/', { leading: true, duplicates: true, trailing: true })
    ).toEqual('some/url/to');
  });
});

describe('appendAppPath', () => {
  it('appends the appBasePath with given path', () => {
    expect(appendAppPath('/app/my-app', '/some-path')).toEqual('/app/my-app/some-path');
    expect(appendAppPath('/app/my-app/', 'some-path')).toEqual('/app/my-app/some-path');
    expect(appendAppPath('/app/my-app', 'some-path')).toEqual('/app/my-app/some-path');
    expect(appendAppPath('/app/my-app', '')).toEqual('/app/my-app');
  });

  it('preserves the trailing slash only if included in the hash', () => {
    expect(appendAppPath('/app/my-app', '/some-path/')).toEqual('/app/my-app/some-path');
    expect(appendAppPath('/app/my-app', '/some-path#/')).toEqual('/app/my-app/some-path#/');
    expect(appendAppPath('/app/my-app', '/some-path#/hash/')).toEqual(
      '/app/my-app/some-path#/hash/'
    );
    expect(appendAppPath('/app/my-app', '/some-path#/hash')).toEqual('/app/my-app/some-path#/hash');
  });
  it('appends the path to the hash when the base url contains a hash', () => {
    expect(appendAppPath('/app/kibana#management', '/kibana/settings')).toEqual(
      '/app/kibana#management/kibana/settings'
    );
  });
});

describe('isLegacyApp', () => {
  it('returns true for legacy apps', () => {
    expect(
      isLegacyApp({
        id: 'legacy',
        title: 'Legacy App',
        appUrl: '/some-url',
        legacy: true,
      })
    ).toEqual(true);
  });
  it('returns false for non-legacy apps', () => {
    expect(
      isLegacyApp({
        id: 'legacy',
        title: 'Legacy App',
        mount: () => () => undefined,
        legacy: false,
      })
    ).toEqual(false);
  });
});

describe('getOrigin', () => {
  it(`returns the current location's origin`, () => {
    expect(getOrigin()).toEqual(window.location.origin);
  });
});

describe('relativeToAbsolute', () => {
  it('converts a relative path to an absolute url', () => {
    const origin = getOrigin();
    expect(relativeToAbsolute('path')).toEqual(`${origin}/path`);
    expect(relativeToAbsolute('/path#hash')).toEqual(`${origin}/path#hash`);
    expect(relativeToAbsolute('/path?query=foo')).toEqual(`${origin}/path?query=foo`);
  });
});

describe('selfOrParentMatch', () => {
  it('returns true if the element matches the predicate', () => {
    const elem = document.createElement('div');
    elem.className = 'foo bar dolly';

    expect(selfOrParentMatch(elem, el => el.tagName === 'div')).toEqual(true);
    expect(selfOrParentMatch(elem, el => el.tagName === 'p')).toEqual(false);
  });

  it('returns true if any parent matches the predicate', () => {
    const elem = document.createElement('div');
    const parent = document.createElement('div');
    parent.className = 'foo classB';
    const parent2 = document.createElement('div');
    parent2.className = 'bar classC';

    parent2.appendChild(parent);
    parent.appendChild(elem);

    expect(selfOrParentMatch(elem, el => el.classList.contains('foo'))).toEqual(true);
    expect(selfOrParentMatch(elem, el => el.classList.contains('bar'))).toEqual(true);
    expect(selfOrParentMatch(elem, el => el.classList.contains('missing'))).toEqual(false);
  });
});
