/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import {
  EuiImage,
  EuiLink,
  EuiBetaBadge,
  EuiPageHeader,
  EuiButtonEmpty,
  EuiSpacer,
  EuiBadge,
} from '@elastic/eui';
import { IBasePath } from '@kbn/core-http-browser';
import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n-react';
import { Content } from './content';
import { TutorialsCategory } from '../../../../common/constants';

export interface IntroductionProps {
  description: string;
  title: string;
  intl: InjectedIntl;
  basePath: IBasePath;
  previewUrl?: string;
  exportedFieldUrl?: string;
  iconType?: string;
  isBeta?: boolean;
  notices?: React.ReactNode;
  exportedFieldsUrl?: string;
  category?: TutorialsCategory;
}

function IntroductionUI({
  description,
  previewUrl,
  title,
  exportedFieldsUrl,
  iconType,
  isBeta = false,
  intl,
  notices,
  basePath,
  category,
}: IntroductionProps) {
  let rightSideItems;
  if (previewUrl) {
    rightSideItems = [
      <EuiImage
        size="l"
        allowFullScreen
        fullScreenIconColor="dark"
        alt={intl.formatMessage({
          id: 'home.tutorial.introduction.imageAltDescription',
          defaultMessage: 'screenshot of primary dashboard.',
        })}
        url={previewUrl}
      />,
    ];
  }
  let exportedFields;
  if (exportedFieldsUrl) {
    exportedFields = (
      <>
        <br />
        <EuiLink href={exportedFieldsUrl} target="_blank" rel="noopener">
          <FormattedMessage
            id="home.tutorial.introduction.viewButtonLabel"
            defaultMessage="View exported fields"
          />
        </EuiLink>
      </>
    );
  }
  let betaBadge;
  if (isBeta) {
    betaBadge = (
      <EuiBetaBadge
        label={intl.formatMessage({
          id: 'home.tutorial.introduction.betaLabel',
          defaultMessage: 'Beta',
        })}
      />
    );
  }
  return (
    <>
      <div>
        <EuiButtonEmpty
          iconType="arrowLeft"
          size="xs"
          flush="left"
          href={basePath.prepend(`/app/integrations`)}
        >
          <FormattedMessage
            id="home.tutorial.introduction.browseAllIntegrationsButton"
            defaultMessage="Browse all integrations"
          />
        </EuiButtonEmpty>
      </div>
      <EuiSpacer />
      <EuiPageHeader
        iconType={iconType}
        pageTitle={
          <>
            {title}
            {betaBadge && (
              <>
                &nbsp;
                {betaBadge}
              </>
            )}

            {category === TutorialsCategory.LOGGING || category === TutorialsCategory.METRICS ? (
              <>
                &nbsp;
                <EuiBadge>
                  <FormattedMessage
                    id="home.tutorial.introduction.beatsBadgeLabel"
                    defaultMessage="Beats"
                  />
                </EuiBadge>
              </>
            ) : null}
          </>
        }
        description={
          <>
            <Content text={description} />
            {exportedFields}
            {notices}
          </>
        }
        rightSideItems={rightSideItems}
      />
    </>
  );
}

export const Introduction = injectI18n(IntroductionUI);
