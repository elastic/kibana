/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { mount } from 'enzyme';
import { I18nProvider } from '@kbn/i18n/react';
import { Intro } from './intro';

describe('Intro component', () => {
  it('renders correctly', () => {
    const mounted = mount(
      <I18nProvider>
        <Intro />
      </I18nProvider>
    );
    expect(mounted.find('Intro')).toMatchSnapshot();
  });
});
