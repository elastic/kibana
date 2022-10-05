/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { Markdown } from './markdown';
import { render } from 'enzyme';

describe('shared ux markdown component', () => {
  it('renders', () => {
    const component = render(<Markdown placeholder={''} ariaLabelContent={''} readOnly={false} />);
    expect(component).toMatchSnapshot();
  });
});
