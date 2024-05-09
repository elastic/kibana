/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FormattedMessage } from '@kbn/i18n-react';
import { EuiIconTip } from '@elastic/eui';
import React from 'react';

export const NoUsersTip = () => (
  <EuiIconTip
    aria-label="Additional information"
    position="bottom"
    type="questionInCircle"
    color="inherit"
    iconProps={{ style: { verticalAlign: 'text-bottom', marginLeft: 2 } }}
    css={{ textWrap: 'balance' }}
    content={
      <FormattedMessage
        id="contentManagement.tableList.listing.noUsersTip"
        defaultMessage="Creators are assigned when dashboards are created (after version 8.14)"
      />
    }
  />
);
