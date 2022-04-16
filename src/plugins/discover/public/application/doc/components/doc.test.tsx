/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { throwError, of } from 'rxjs';
import React from 'react';
import { act } from 'react-dom/test-utils';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { ReactWrapper } from 'enzyme';
import { findTestSubject } from '@elastic/eui/lib/test';
import { Doc, DocProps } from './doc';
import { SEARCH_FIELDS_FROM_SOURCE as mockSearchFieldsFromSource } from '../../../../common';
import { indexPatternMock } from '../../../__mocks__/index_pattern';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';

const mockSearchApi = jest.fn();

jest.mock('../../../kibana_services', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let registry: any[] = [];

  return {
    getDocViewsRegistry: () => ({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
async function mountDoc(update = false) {
  const props = {
    id: '1',
    index: 'index1',
    indexPattern: indexPatternMock,
  } as DocProps;
  let comp!: ReactWrapper;
  const services = {
    metadata: {
      branch: 'test',
    },
    data: {
      search: {
        search: mockSearchApi,
      },
    },
    docLinks: {
      links: {
        apis: {
          indexExists: 'mockUrl',
        },
      },
    },
    uiSettings: {
      get: (key: string) => {
        if (key === mockSearchFieldsFromSource) {
          return false;
        }
      },
    },
  };
  await act(async () => {
    comp = mountWithIntl(
      <KibanaContextProvider services={services}>
        <Doc {...props} />
      </KibanaContextProvider>
    );
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
