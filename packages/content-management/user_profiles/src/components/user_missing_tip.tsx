/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FormattedMessage } from '@kbn/i18n-react';
import { EuiIconTip, IconType } from '@elastic/eui';
import React from 'react';

export const NoCreatorTip = (props: { iconType?: IconType; includeVersionTip?: boolean }) => (
  <NoUsersTip
    content={
      <>
        <FormattedMessage
          id="contentManagement.userProfiles.noCreatorTip"
          defaultMessage="Creators are assigned when objects are created "
        />
        {props.includeVersionTip && (
          <>
            {' '}
            <FormattedMessage
              id="contentManagement.userProfiles.noCreatorTipVersion"
              defaultMessage=" (after version {version})"
              values={{ version: '8.14' }}
            />
          </>
        )}
      </>
    }
    {...props}
  />
);

export const NoUpdaterTip = (props: { iconType?: string; includeVersionTip?: boolean }) => (
  <NoUsersTip
    content={
      <>
        <FormattedMessage
          id="contentManagement.userProfiles.noUpdaterTip"
          defaultMessage="Updated by is set when objects are updated"
        />
        <>
          {' '}
          <FormattedMessage
            id="contentManagement.userProfiles.noCreatorTipVersion"
            defaultMessage=" (after version {version})"
            values={{ version: '8.14' }}
          />
        </>
      </>
    }
    {...props}
  />
);

const NoUsersTip = ({
  iconType: type = 'questionInCircle',
  ...props
}: {
  content: React.ReactNode;
  iconType?: IconType;
}) => (
  <EuiIconTip
    aria-label="Additional information"
    position="top"
    color="inherit"
    iconProps={{ style: { verticalAlign: 'text-bottom', marginLeft: 2 } }}
    css={{ textWrap: 'balance' }}
    type={type}
    {...props}
  />
);
