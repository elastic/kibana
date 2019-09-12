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
import { mountWithIntl } from 'test_utils/enzyme_helpers';
// @ts-ignore
import { findTestSubject } from '@elastic/eui/lib/test';

import { Doc, DocProps } from './doc';

export const waitForPromises = () => new Promise(resolve => setTimeout(resolve, 0));

function buildProps(search: () => {}) {
  const indexPattern = {
    getComputedFields: () => [],
  } as any;

  return {
    id: '1',
    index: 'index1',
    esClient: { search },
    indexPattern,
  } as DocProps;
}

describe('Test of <Doc /> of Discover', () => {
  it('renders loading msg', async () => {
    const search = jest.fn();
    const comp = mountWithIntl(<Doc {...buildProps(search)} />);

    expect(findTestSubject(comp, 'doc-msg-loading').length).toBe(1);
  });

  it('renders notFound msg', async () => {
    const search = jest.fn(() => Promise.reject({ status: 404 }));
    const comp = mountWithIntl(<Doc {...buildProps(search)} />);
    await waitForPromises();
    comp.update();

    expect(findTestSubject(comp, 'doc-msg-notFound').length).toBe(1);
  });

  it('renders error msg', async () => {
    const search = jest.fn(() => Promise.reject('whatever'));
    const comp = mountWithIntl(<Doc {...buildProps(search)} />);

    await waitForPromises();
    comp.update();

    expect(findTestSubject(comp, 'doc-msg-error').length).toBe(1);
  });

  it('renders elasticsearch hit ', async () => {
    const result = { hits: { total: 1, hits: [{ _id: 1, _source: { test: 1 } }] } };
    const search = jest.fn(() => Promise.resolve(result));
    const comp = mountWithIntl(<Doc {...buildProps(search)} />);

    await waitForPromises();
    comp.update();

    expect(findTestSubject(comp, 'doc-hit').length).toBe(1);
  });
});
