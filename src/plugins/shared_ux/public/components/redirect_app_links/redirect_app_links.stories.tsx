/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { BehaviorSubject } from 'rxjs';

import { RedirectAppLinks } from './redirect_app_links';
import mdx from './redirect_app_link.mdx';

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
    <EuiFlexGroup gutterSize="m" responsive={false} wrap>
      <EuiFlexItem grow={false}>
        <RedirectAppLinks
          navigateToUrl={() => Promise.resolve()}
          currentAppId$={new BehaviorSubject('test')}
        >
          <EuiButton data-test-subj="homeAddData" fill iconType="plusInCircle">
            <FormattedMessage
              id="sharedUX.addData.addDataButtonLabel"
              defaultMessage="Add integrations"
            />
          </EuiButton>
        </RedirectAppLinks>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
