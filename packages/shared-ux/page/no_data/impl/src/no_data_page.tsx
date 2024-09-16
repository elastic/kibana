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

import { EuiPageTemplate, EuiLink, EuiSpacer, EuiText, EuiTextColor } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { KibanaSolutionAvatar } from '@kbn/shared-ux-avatar-solution';
import type { NoDataPageProps } from '@kbn/shared-ux-page-no-data-types';

import { ActionCard } from './action_card';

export const NoDataPage = ({
  solution,
  logo,
  action,
  docsLink,
  pageTitle,
  pageDescription,
  className,
}: NoDataPageProps) => {
  const title =
    pageTitle ||
    i18n.translate('sharedUXPackages.noDataPage.welcomeTitle', {
      defaultMessage: 'Welcome to Elastic {solution}!',
      values: { solution },
    });

  const link = docsLink ? (
    <EuiLink href={docsLink} target="_blank">
      <FormattedMessage id="sharedUXPackages.noDataPage.intro.link" defaultMessage="learn more" />
    </EuiLink>
  ) : null;

  const message =
    pageDescription ??
    (link ? (
      <FormattedMessage
        id="sharedUXPackages.noDataPage.intro"
        defaultMessage="Add your data to get started, or {link} about {solution}."
        values={{
          solution,
          link,
        }}
      />
    ) : (
      <FormattedMessage
        id="sharedUXPackages.noDataPage.introNoDocLink"
        defaultMessage="Add your data to get started."
      />
    ));

  return (
    <EuiPageTemplate.Section
      alignment="center"
      grow
      className={classNames('kbnNoDataPageContents', className)}
      data-test-subj="kbnNoDataPage"
    >
      <EuiText textAlign="center">
        <KibanaSolutionAvatar name={solution} iconType={logo || `logo${solution}`} size="xxl" />
        <EuiSpacer size="l" />
        <h1>{title}</h1>
        <EuiTextColor color="subdued">
          <p>{message}</p>
        </EuiTextColor>
      </EuiText>
      <EuiSpacer size="xxl" />
      <ActionCard {...{ action }} />
    </EuiPageTemplate.Section>
  );
};
