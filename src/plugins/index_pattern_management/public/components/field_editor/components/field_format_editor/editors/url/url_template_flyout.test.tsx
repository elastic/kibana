/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { shallowWithI18nProvider } from '@kbn/test/jest';

import { UrlTemplateFlyout } from './url_template_flyout';

describe('UrlTemplateFlyout', () => {
  it('should render normally', async () => {
    const component = shallowWithI18nProvider(<UrlTemplateFlyout isVisible={true} />);
    expect(component).toMatchSnapshot();
  });

  it('should not render if not visible', async () => {
    const component = shallowWithI18nProvider(<UrlTemplateFlyout />);
    expect(component).toMatchSnapshot();
  });
});
