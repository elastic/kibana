/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { EuiLink, EuiTitle } from '@elastic/eui';
import { shallowWithIntl } from '@kbn/test-jest-helpers';

import { DocumentationLink } from './documentation_link';

describe('<DocumentationLink />', () => {
  test('is rendered correctly', () => {
    const component = shallowWithIntl(<DocumentationLink href={'dummy'} />);
    expect(component).toMatchSnapshot();

    expect(component.find('dl').length).toBe(1);
    expect(component.find(EuiTitle).length).toBe(1);
    expect(component.find(EuiLink).length).toBe(1);

    const link = component.find(EuiLink).at(0);
    expect(link.prop('href')).toBe('dummy');
  });
});
