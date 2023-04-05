/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { mountWithIntl } from '@kbn/test-jest-helpers';
import React from 'react';
import { ResetSearchButton } from './reset_search_button';

describe('ResetSearchButton', () => {
  it('should call resetSavedSearch when the button is clicked', () => {
    const resetSavedSearch = jest.fn();
    const component = mountWithIntl(<ResetSearchButton resetSavedSearch={resetSavedSearch} />);
    component.find('button[data-test-subj="resetSavedSearch"]').simulate('click');
    expect(resetSavedSearch).toHaveBeenCalled();
  });
});
