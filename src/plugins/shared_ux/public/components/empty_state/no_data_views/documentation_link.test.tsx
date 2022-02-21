/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiLink, EuiTitle } from '@elastic/eui';
import { DocumentationLink } from './documentation_link';
import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';

describe('<DocumentationLink />', () => {
  test('is rendered correctly', () => {
    const component = mountWithIntl(<DocumentationLink documentationUrl={'dummy'} />);
    expect(component).toMatchSnapshot();

    expect(component.find('dl').length).toBe(1);
    expect(component.find(EuiTitle).length).toBe(1);
    expect(component.find(EuiLink).length).toBe(1);

    const link = component.find(EuiLink).at(0);
    expect(link.prop('href')).toBe('dummy');
  });
});
