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

import { EuiPageTemplate, EuiSpacer, EuiText, EuiTextColor } from '@elastic/eui';

import type { NoDataPageProps } from '@kbn/shared-ux-page-no-data-types';

import { ActionCard } from './action_card';

export const NoDataPage = ({ action, pageTitle, pageDescription, className }: NoDataPageProps) => {
  return (
    <EuiPageTemplate.Section
      alignment="center"
      grow
      className={classNames('kbnNoDataPageContents', className)}
      data-test-subj="kbnNoDataPage"
    >
      {(pageTitle || pageDescription) && (
        <>
          <EuiText textAlign="center" size="m">
            <EuiSpacer size="l" />
            {pageTitle && <h1>{pageTitle}</h1>}
            {pageDescription && (
              <EuiTextColor color="subdued">
                <p>{pageDescription}</p>
              </EuiTextColor>
            )}
            <EuiSpacer size="xxl" />
          </EuiText>
        </>
      )}
      <ActionCard {...{ action }} />
    </EuiPageTemplate.Section>
  );
};
