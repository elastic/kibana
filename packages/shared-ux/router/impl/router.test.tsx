/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { Router } from './router';
import { createMemoryHistory } from 'history';

describe('component', () => {
  it('should change pageName on new page', () => {
    const historyLocation = {
      ...createMemoryHistory(),
      location: { path: '/page1', pathname: 'Page 1', search: '', state: '', hash: '' },
    };
    const component = render(<Router history={historyLocation} />);
    expect(component.getByText('Page 1')).toEqual('Page 1');
  });
});
