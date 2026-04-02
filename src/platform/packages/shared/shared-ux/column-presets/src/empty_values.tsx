/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import type { UseEuiTheme } from '@elastic/eui';

const COLUMN_EMPTY_VALUE = '—';
const COLUMN_EMPTY_STRING = i18n.translate('sharedUXPackages.columnPresets.emptyStringValue', {
  defaultMessage: '(Empty String)',
});

const emptyWrapperCss = ({ euiTheme }: UseEuiTheme) => ({ color: euiTheme.colors.mediumShade });

export const EmptyCellValue = () => <span css={emptyWrapperCss}>{COLUMN_EMPTY_VALUE}</span>;

export const EmptyCellString = () => <span css={emptyWrapperCss}>{COLUMN_EMPTY_STRING}</span>;

export const valueOrEmpty = (value: string | number | null | undefined) => {
  if (value == null) {
    return <EmptyCellValue />;
  }

  if (value === '') {
    return <EmptyCellString />;
  }

  return value;
};
