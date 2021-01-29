/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test/jest';
import { ReactWrapper } from 'enzyme';
import { ContextErrorMessage } from './context_error_message';
// @ts-ignore
import { FAILURE_REASONS, LOADING_STATUS } from '../../angular/context/query';
import { findTestSubject } from '@elastic/eui/lib/test';

describe('loading spinner', function () {
  let component: ReactWrapper;

  it('ContextErrorMessage does not render on loading', () => {
    component = mountWithIntl(<ContextErrorMessage status={LOADING_STATUS.LOADING} />);
    expect(findTestSubject(component, 'contextErrorMessageTitle').length).toBe(0);
  });

  it('ContextErrorMessage does not render on success loading', () => {
    component = mountWithIntl(<ContextErrorMessage status={LOADING_STATUS.LOADED} />);
    expect(findTestSubject(component, 'contextErrorMessageTitle').length).toBe(0);
  });

  it('ContextErrorMessage renders just the title if the reason is not specifically handled', () => {
    component = mountWithIntl(<ContextErrorMessage status={LOADING_STATUS.FAILED} />);
    expect(findTestSubject(component, 'contextErrorMessageTitle').length).toBe(1);
    expect(findTestSubject(component, 'contextErrorMessageBody').text()).toBe('');
  });

  it('ContextErrorMessage renders the reason for unknown errors', () => {
    component = mountWithIntl(
      <ContextErrorMessage status={LOADING_STATUS.FAILED} reason={FAILURE_REASONS.UNKNOWN} />
    );
    expect(findTestSubject(component, 'contextErrorMessageTitle').length).toBe(1);
    expect(findTestSubject(component, 'contextErrorMessageBody').length).toBe(1);
  });
});
