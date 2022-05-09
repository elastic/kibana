/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiButton } from '@elastic/eui';
import React from 'react';
import { BehaviorSubject } from 'rxjs';

import { action } from '@storybook/addon-actions';
import { RedirectAppLinks } from './redirect_app_links';
import mdx from './redirect_app_links.mdx';

export default {
  title: 'Redirect App Links',
  description: 'app links component that takes in an application id and navigation url.',
  parameters: {
    docs: {
      page: mdx,
    },
  },
};

export const Component = () => {
  return (
    <RedirectAppLinks
      navigateToUrl={() => Promise.resolve()}
      currentAppId$={new BehaviorSubject('test')}
    >
      <EuiButton
        data-test-subj="storybookButton"
        fill
        iconType="plusInCircle"
        onClick={action('button pressed')}
      >
        Test link
      </EuiButton>
    </RedirectAppLinks>
  );
};
