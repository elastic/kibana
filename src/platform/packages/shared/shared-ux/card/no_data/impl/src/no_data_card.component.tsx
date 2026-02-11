/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiButton, EuiPageTemplate, EuiTitle, EuiLink, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import type { NoDataCardComponentProps as Props } from '@kbn/shared-ux-card-no-data-types';
import { ElasticAgentCardIllustration } from './elastic_agent_card_illustration';

export const NO_DATA_CARD_MAX_WIDTH = 400;

const defaultTitle = i18n.translate('sharedUXPackages.card.noData.title', {
  defaultMessage: 'Add Data to get started',
});

const defaultDescription = i18n.translate('sharedUXPackages.card.noData.description', {
  defaultMessage:
    'Browse integration options to find the best way to add your data and start analyzing.',
});

const defaultButtonText = i18n.translate('sharedUXPackages.card.noData.buttonLabel', {
  defaultMessage: 'Browse integrations',
});

const noPermissionTitle = i18n.translate('sharedUXPackages.card.noData.noPermission.title', {
  defaultMessage: 'Contact your administrator',
});

const noPermissionDescription = i18n.translate(
  'sharedUXPackages.card.noData.noPermission.description',
  {
    defaultMessage: `This integration is not yet enabled. Your administrator has the required permissions to turn it on.`,
  }
);

export const NoDataCard = ({
  title,
  description,
  canAccessFleet = true,
  href,
  buttonText,
  buttonIsDisabled,
  disabledButtonTooltipText,
  docsLink: link,
  onClick,
  icon,
  'data-test-subj': dataTestSubj = 'noDataCard',
}: Props) => {
  const cardIcon = icon ? icon : <ElasticAgentCardIllustration />;
  const docsLink = link || 'https://www.elastic.co/kibana';
  const isButtonDisabled = buttonIsDisabled || !!disabledButtonTooltipText;

  return (
    <EuiPageTemplate.EmptyPrompt
      data-test-subj={dataTestSubj}
      css={css`
        && {
          max-width: ${NO_DATA_CARD_MAX_WIDTH}px;
        }
      `}
      title={
        <EuiTitle size="m">
          <h2>{canAccessFleet ? title || defaultTitle : noPermissionTitle}</h2>
        </EuiTitle>
      }
      icon={cardIcon}
      body={<p>{canAccessFleet ? description || defaultDescription : noPermissionDescription}</p>}
      actions={
        canAccessFleet && href ? (
          isButtonDisabled ? (
            disabledButtonTooltipText ? (
              <EuiToolTip position="right" content={disabledButtonTooltipText}>
                <EuiButton disabled data-test-subj="noDataDefaultActionButton">
                  {buttonText || defaultButtonText}
                </EuiButton>
              </EuiToolTip>
            ) : (
              <EuiButton disabled data-test-subj="noDataDefaultActionButton">
                {buttonText || defaultButtonText}
              </EuiButton>
            )
          ) : (
            // eslint-disable-next-line @elastic/eui/href-or-on-click
            <EuiButton
              color="primary"
              fill
              href={href}
              data-test-subj="noDataDefaultActionButton"
              onClick={onClick}
            >
              {buttonText || defaultButtonText}
            </EuiButton>
          )
        ) : undefined
      }
      footer={
        <>
          <EuiTitle size="xxs">
            <span>
              {i18n.translate('sharedUXPackages.card.noData.learnMore', {
                defaultMessage: 'Want to learn more?',
              })}
            </span>
          </EuiTitle>{' '}
          <EuiLink href={docsLink} target="_blank">
            {i18n.translate('sharedUXPackages.card.noData.readDocs', {
              defaultMessage: 'Read the docs',
            })}
          </EuiLink>
        </>
      }
    />
  );
};
