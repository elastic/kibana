/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { RedirectAppLinksStorybookMock } from '@kbn/shared-ux-link-redirect-app-mocks';

import { EuiButton } from '@elastic/eui';
import { RedirectAppLinks as Component } from './redirect_app_links';
import mdx from '../README.mdx';

export default {
  title: 'Link/Redirect App Links Styling',
  description: 'Adding this story to test styling',
  parameters: {
    docs: {
      page: mdx,
    },
  },
};

const mock = new RedirectAppLinksStorybookMock();

export const RedirectAppLinks = () => {
  return (
    <>
      <Component {...mock.getProps()}>
        <EuiButton />
      </Component>
    </>
  );
};

RedirectAppLinks.argTypes = mock.getArgumentTypes();
