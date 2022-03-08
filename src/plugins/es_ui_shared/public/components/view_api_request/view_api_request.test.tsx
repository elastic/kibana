/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { act } from 'react-dom/test-utils';
import { mountWithI18nProvider } from '@kbn/test-jest-helpers';
import { ViewApiRequest } from './view_api_request';
import { findTestSubject, takeMountedSnapshot } from '@elastic/eui/lib/test';

const payload = {
  title: 'Test title',
  description: 'Test description',
  request: 'Hello world',
  closeFlyout: jest.fn(),
};

describe('EuiCodeEditor', () => {
  test('is rendered', () => {
    const component = mountWithI18nProvider(<ViewApiRequest {...payload} />);
    expect(takeMountedSnapshot(component)).toMatchSnapshot();
  });

  describe('props', () => {
    test('on closeFlyout', async () => {
      const component = mountWithI18nProvider(<ViewApiRequest {...payload} />);

      await act(async () => {
        findTestSubject(component, 'apiRequestFlyoutClose').simulate('click');
      });

      expect(payload.closeFlyout).toBeCalled();
    });
  });
});
