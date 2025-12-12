/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import classNames from 'classnames';

import { EuiPageTemplate } from '@elastic/eui';

import type { NoDataPageProps } from '@kbn/shared-ux-page-no-data-types';

import { ActionCard } from './action_card';

export const NoDataPage = ({ action, className }: NoDataPageProps) => {
  return (
    <EuiPageTemplate.Section
      alignment="center"
      grow
      className={classNames('kbnNoDataPageContents', className)}
      data-test-subj="kbnNoDataPage"
    >
      <ActionCard {...{ action }} />
    </EuiPageTemplate.Section>
  );
};
