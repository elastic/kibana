/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ApplicationStart } from 'kibana/public';
import React from 'react';
import { applicationServiceMock } from 'src/core/public/mocks';

import { RedirectAppLinks as RedirectAppLinksComponent } from './redirect_app_link';
import { RedirectAppLinks } from './redirect_app_link';
import mdx from './redirect_app_link.mdx';

export default {
  title: 'Redirect App Links',
  description: '',
  parameters: {
    docs: {
      page: mdx,
    },
  },
};

export const ConnectedComponent = ({ application }: { application: ApplicationStart }) => {
  return <RedirectAppLinks application={application} />;
};

ConnectedComponent.argTypes = {};

export const PureComponent = () => {
  return <RedirectAppLinksComponent application={applicationServiceMock.createStartContract()} />;
};
