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

import { removeSlashes } from './remove_slashes';

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
