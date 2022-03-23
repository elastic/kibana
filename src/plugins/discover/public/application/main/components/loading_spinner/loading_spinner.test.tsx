/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { ReactWrapper } from 'enzyme';
import { LoadingSpinner } from './loading_spinner';
import { findTestSubject } from '@elastic/eui/lib/test';

describe('loading spinner', function () {
  let component: ReactWrapper;

  it('LoadingSpinner renders a Searching text and a spinner', () => {
    component = mountWithIntl(<LoadingSpinner />);
    expect(findTestSubject(component, 'loadingSpinnerText').text()).toBe('Searching');
    expect(findTestSubject(component, 'loadingSpinner').length).toBe(1);
  });
});
