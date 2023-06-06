/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FormattedMessage } from '@kbn/i18n-react';
import { EuiHeaderLink, EuiHeaderSectionItem } from '@elastic/eui';
import React, { MouseEventHandler } from 'react';

export const TEST_ID = 'projectSwitcherButton';

export interface Props {
  onClick: MouseEventHandler<HTMLButtonElement>;
}

export const HeaderButton = (props: Props) => (
  <EuiHeaderSectionItem aria-label="Developer Tools">
    <EuiHeaderLink
      onClick={props.onClick}
      iconSide="right"
      iconType="arrowDown"
      data-test-subj={TEST_ID}
    >
      <FormattedMessage
        id="serverlessPackages.chrome.linkToCloud.projects"
        defaultMessage="My project"
      />
    </EuiHeaderLink>
  </EuiHeaderSectionItem>
);
