/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { action } from '@storybook/addon-actions';

import { RedirectAppLinks as Component } from '@kbn/shared-ux-link-redirect-app';
import { RedirectAppLinksStorybookMock } from './mock';

export default {
  title: 'Link',
  description:
    'An "area of effect" component which intercepts clicks on anchor elements and redirects them to Kibana solutions without a page refresh.',
};

export const RedirectAppLinks = () => {
  return (
    <>
      <Component {...RedirectAppLinksStorybookMock.getServices()}>
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

RedirectAppLinks.argTypes = RedirectAppLinksStorybookMock.getArgumentTypes();
