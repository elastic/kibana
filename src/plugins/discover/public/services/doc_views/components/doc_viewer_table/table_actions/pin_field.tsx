/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiListGroupItem } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

export interface Props {
  pinned: boolean;
  onClick: () => void;
}

export const PinField = ({ pinned, onClick }: Props) => {
  const label = pinned ? (
    <FormattedMessage id="discover.docViews.table.unPinField" defaultMessage="Unpin field" />
  ) : (
    <FormattedMessage id="discover.docViews.table.pinField" defaultMessage="Pin field" />
  );

  return (
    <EuiListGroupItem
      size="s"
      color="primary"
      iconType="pinFilled"
      iconProps={{ color: 'default' }}
      label={label}
      onClick={onClick}
    />
  );
};
