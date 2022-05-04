/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';

import { action } from '@storybook/addon-actions';
import { RedirectAppLinks } from '.';
import mdx from '../README.mdx';

export default {
  title: 'Redirect App Links',
  description:
    'An "area of effect" component which intercepts clicks on anchor elements and redirects them to Kibana solutions without a page refresh.',
  parameters: {
    docs: {
      page: mdx,
    },
  },
};

export const Component = () => {
  const navigateToUrl = async (url: string) => {
    action('navigateToUrl')(url);
  };

  const currentAppId = 'abc123';

  return (
    <>
      <RedirectAppLinks {...{ currentAppId, navigateToUrl }}>
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="storybookButton"
              iconType="plusInCircle"
              href="/some-test-url"
            >
              Button with URL
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="storybookButton"
              iconType="plusInCircle"
              onClick={action('onClick')}
            >
              Button without URL
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </RedirectAppLinks>
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <EuiButton
            data-test-subj="storybookButton"
            iconType="plusInCircle"
            href="/?path=/story/redirect-app-links--component"
          >
            Button outside RedirectAppLinks
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
