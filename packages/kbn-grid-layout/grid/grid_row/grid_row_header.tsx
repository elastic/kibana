/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React from 'react';
import { EuiButtonIcon, EuiFlexGroup, EuiSpacer, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export const GridRowHeader = ({
  isCollapsed,
  toggleIsCollapsed,
  rowTitle,
}: {
  isCollapsed: boolean;
  toggleIsCollapsed: () => void;
  rowTitle?: string;
}) => {
  return (
    <>
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="s">
        <EuiButtonIcon
          color="text"
          aria-label={i18n.translate('kbnGridLayout.row.toggleCollapse', {
            defaultMessage: 'Toggle collapse',
          })}
          iconType={isCollapsed ? 'arrowRight' : 'arrowDown'}
          onClick={toggleIsCollapsed}
        />
        <EuiTitle size="xs">
          <h2>{rowTitle}</h2>
        </EuiTitle>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
    </>
  );
};
