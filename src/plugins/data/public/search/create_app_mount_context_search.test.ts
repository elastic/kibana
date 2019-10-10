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

import { createAppMountSearchContext } from './create_app_mount_context_search';
import { from } from 'rxjs';

describe('Create app mount search context', () => {
  it('Returns search fn when there are no strategies', () => {
    const context = createAppMountSearchContext({});
    expect(context.search).toBeDefined();
  });

  it(`Search throws an error when the strategy doesn't exist`, () => {
    const context = createAppMountSearchContext({});
    expect(() => context.search({}, {}, 'noexist').toPromise()).toThrowErrorMatchingInlineSnapshot(
      `"Strategy with name noexist does not exist"`
    );
  });

  it(`Search fn is called on appropriate strategy name`, done => {
    const context = createAppMountSearchContext({
      mysearch: search =>
        Promise.resolve({
          search: () => from(Promise.resolve({ percentComplete: 98 })),
        }),
      anothersearch: search =>
        Promise.resolve({
          search: () => from(Promise.resolve({ percentComplete: 0 })),
        }),
    });

    context.search({}, {}, 'mysearch').subscribe(response => {
      expect(response).toEqual({ percentComplete: 98 });
      done();
    });
  });

  it(`Search fn is called with the passed in request object`, done => {
    const context = createAppMountSearchContext({
      mysearch: search => {
        return Promise.resolve({
          search: request => {
            expect(request).toEqual({ greeting: 'hi' });
            return from(Promise.resolve({}));
          },
        });
      },
    });
    context
      .search({ greeting: 'hi' } as any, {}, 'mysearch')
      .subscribe(response => {}, () => {}, done);
  });
});
