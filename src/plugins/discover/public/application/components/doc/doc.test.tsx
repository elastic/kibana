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
import { throwError, of } from 'rxjs';
import React from 'react';
import { act } from 'react-dom/test-utils';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import { ReactWrapper } from 'enzyme';
import { findTestSubject } from '@elastic/eui/lib/test';
import { Doc, DocProps } from './doc';

const mockSearchApi = jest.fn();

jest.mock('../../../kibana_services', () => {
  let registry: any[] = [];

  return {
    getServices: () => ({
      metadata: {
        branch: 'test',
      },
      data: {
        search: {
          search: mockSearchApi,
        },
      },
    }),
    getDocViewsRegistry: () => ({
      addDocView(view: any) {
        registry.push(view);
      },
      getDocViewsSorted() {
        return registry;
      },
      resetRegistry: () => {
        registry = [];
      },
    }),
  };
});

beforeEach(() => {
  jest.clearAllMocks();
});

const waitForPromises = async () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve));
  });

/**
 * this works but logs ugly error messages until we're using React 16.9
 * should be adapted when we upgrade
 */
async function mountDoc(update = false, indexPatternGetter: any = null) {
  const indexPattern = {
    getComputedFields: () => [],
  };
  const indexPatternService = {
    get: indexPatternGetter ? indexPatternGetter : jest.fn(() => Promise.resolve(indexPattern)),
  } as any;

  const props = {
    id: '1',
    index: 'index1',
    indexPatternId: 'xyz',
    indexPatternService,
  } as DocProps;
  let comp!: ReactWrapper;
  await act(async () => {
    comp = mountWithIntl(<Doc {...props} />);
    if (update) comp.update();
  });
  if (update) {
    await waitForPromises();
    comp.update();
  }
  return comp;
}

describe('Test of <Doc /> of Discover', () => {
  test('renders loading msg', async () => {
    const comp = await mountDoc();
    expect(findTestSubject(comp, 'doc-msg-loading').length).toBe(1);
  });

  test('renders IndexPattern notFound msg', async () => {
    const indexPatternGetter = jest.fn(() => Promise.reject({ savedObjectId: '007' }));
    const comp = await mountDoc(true, indexPatternGetter);
    expect(findTestSubject(comp, 'doc-msg-notFoundIndexPattern').length).toBe(1);
  });

  test('renders notFound msg', async () => {
    mockSearchApi.mockImplementation(() => throwError({ status: 404 }));
    const comp = await mountDoc(true);
    expect(findTestSubject(comp, 'doc-msg-notFound').length).toBe(1);
  });

  test('renders error msg', async () => {
    mockSearchApi.mockImplementation(() => throwError({ error: 'something else' }));
    const comp = await mountDoc(true);
    expect(findTestSubject(comp, 'doc-msg-error').length).toBe(1);
  });

  test('renders elasticsearch hit ', async () => {
    mockSearchApi.mockImplementation(() =>
      of({ rawResponse: { hits: { total: 1, hits: [{ _id: 1, _source: { test: 1 } }] } } })
    );
    const comp = await mountDoc(true);
    expect(findTestSubject(comp, 'doc-hit').length).toBe(1);
  });
});
