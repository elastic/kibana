/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { action } from '@storybook/addon-actions';
import { RedirectAppLinksStorybookMock } from '@kbn/shared-ux-link-redirect-app-mocks';

import { RedirectAppLinks as Component } from './redirect_app_links';
import mdx from '../README.mdx';

export default {
  title: 'Link/Redirect App Links',
  description:
    'An "area of effect" component which intercepts clicks on anchor elements and redirects them to Kibana solutions without a page refresh.',
  parameters: {
    docs: {
      page: mdx,
    },
  },
};

const mock = new RedirectAppLinksStorybookMock();

export const RedirectAppLinks = () => {
  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
        <Component {...mock.getProps()}>
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
        </Component>
      </EuiFlexItem>
      <EuiFlexItem>
        <div>
          <EuiButton
            data-test-subj="storybookButton"
            iconType="plusInCircle"
            href="/?path=/story/redirect-app-links--component"
          >
            Button outside RedirectAppLinks
          </EuiButton>
        </div>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

RedirectAppLinks.argTypes = mock.getArgumentTypes();
