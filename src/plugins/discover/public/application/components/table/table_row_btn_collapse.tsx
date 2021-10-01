/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiToolTip, EuiButtonIcon } from '@elastic/eui';

export interface Props {
  onClick: () => void;
  isCollapsed: boolean;
}

export function DocViewTableRowBtnCollapse({ onClick, isCollapsed }: Props) {
  const label = i18n.translate('discover.docViews.table.toggleFieldDetails', {
    defaultMessage: 'Toggle field details',
  });
  return (
    <EuiToolTip content={label}>
      <EuiButtonIcon
        aria-expanded={!isCollapsed}
        aria-label={label}
        data-test-subj="collapseBtn"
        onClick={() => onClick()}
        iconType={isCollapsed ? 'arrowRight' : 'arrowDown'}
        iconSize={'s'}
      />
    </EuiToolTip>
  );
}
