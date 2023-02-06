/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { MoveData } from './move_data';
import { shallowWithIntl } from '@kbn/test-jest-helpers';

const addBasePathMock = jest.fn((path: string) => (path ? path : 'path'));

describe('MoveData', () => {
  test('renders as expected', () => {
    const component = shallowWithIntl(<MoveData addBasePath={addBasePathMock} />);

    const $button = component.find('EuiButton');
    expect($button.props().href).toBe('/app/management/data/migrate_data');
  });
});
