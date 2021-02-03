/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { Content } from './content';
import {
  EuiTitle,
  EuiFlexItem,
  EuiFlexGroup,
  EuiSpacer,
  EuiImage,
  EuiButton,
  EuiIcon,
  EuiBetaBadge,
} from '@elastic/eui';

import { FormattedMessage, injectI18n } from '@kbn/i18n/react';

function IntroductionUI({
  description,
  previewUrl,
  title,
  exportedFieldsUrl,
  iconType,
  isBeta,
  intl,
}) {
  let img;
  if (previewUrl) {
    img = (
      <EuiImage
        size="l"
        hasShadow
        allowFullScreen
        fullScreenIconColor="dark"
        alt={intl.formatMessage({
          id: 'home.tutorial.introduction.imageAltDescription',
          defaultMessage: 'screenshot of primary dashboard.',
        })}
        url={previewUrl}
      />
    );
  }
  let exportedFields;
  if (exportedFieldsUrl) {
    exportedFields = (
      <div>
        <EuiSpacer />
        <EuiButton href={exportedFieldsUrl} target="_blank" rel="noopener">
          <FormattedMessage
            id="home.tutorial.introduction.viewButtonLabel"
            defaultMessage="View exported fields"
          />
        </EuiButton>
      </div>
    );
  }
  let icon;
  if (iconType) {
    icon = (
      <EuiFlexItem grow={false}>
        <EuiIcon size="xl" title="" type={iconType} />
      </EuiFlexItem>
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
    <EuiFlexGroup>
      <EuiFlexItem>
        <EuiFlexGroup gutterSize="l" alignItems="center">
          {icon}
          <EuiFlexItem grow={false}>
            <EuiTitle size="l">
              <h1>
                {title}
                {betaBadge && (
                  <>
                    &nbsp;
                    {betaBadge}
                  </>
                )}
              </h1>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>

        <Content text={description} />
        {exportedFields}
      </EuiFlexItem>

      <EuiFlexItem grow={false}>{img}</EuiFlexItem>
    </EuiFlexGroup>
  );
}

IntroductionUI.propTypes = {
  description: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  previewUrl: PropTypes.string,
  exportedFieldsUrl: PropTypes.string,
  iconType: PropTypes.string,
  isBeta: PropTypes.bool,
};

IntroductionUI.defaultProps = {
  isBeta: false,
};

export const Introduction = injectI18n(IntroductionUI);
