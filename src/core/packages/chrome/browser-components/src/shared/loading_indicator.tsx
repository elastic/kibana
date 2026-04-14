/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Global, css } from '@emotion/react';
import { EuiLoadingSpinner, EuiProgress, EuiIcon, EuiImage } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useIsLoading } from './chrome_hooks';

export interface LoadingIndicatorProps {
  showAsBar?: boolean;
  customLogo?: string;
  elasticLogoColor?: string;
}

export const LoadingIndicator = ({
  showAsBar = false,
  customLogo,
  elasticLogoColor,
}: LoadingIndicatorProps) => {
  const isLoading = useIsLoading();

  const loadingSubj = isLoading ? 'globalLoadingIndicator' : 'globalLoadingIndicator-hidden';
  const testSubj = customLogo ? `${loadingSubj} customLogo` : loadingSubj;

  const ariaLabel = i18n.translate('core.ui.loadingIndicatorAriaLabel', {
    defaultMessage: 'Loading content',
  });

  const logoImage = customLogo ? (
    <EuiImage
      src={customLogo}
      data-test-subj={testSubj}
      size={24}
      alt="logo"
      aria-label={i18n.translate('core.ui.chrome.headerGlobalNav.customLogoAriaLabel', {
        defaultMessage: 'User logo',
      })}
    />
  ) : (
    <EuiIcon
      type={'logoElastic'}
      size="l"
      color={elasticLogoColor}
      data-test-subj={testSubj}
      aria-label={i18n.translate('core.ui.chrome.headerGlobalNav.logoAriaLabel', {
        defaultMessage: 'Elastic Logo',
      })}
    />
  );

  const logo = isLoading ? (
    <EuiLoadingSpinner
      size="l"
      data-test-subj={testSubj}
      aria-hidden={false}
      aria-label={ariaLabel}
    />
  ) : (
    logoImage
  );

  return (
    <>
      <Global
        styles={{
          '.euiHeaderSectionItem .euiButtonEmpty__text': {
            display: 'flex',
          },
        }}
      />
      {showAsBar ? (
        <EuiProgress
          className={!isLoading ? 'kbnLoadingIndicator-hidden' : undefined}
          css={!isLoading ? css({ visibility: 'hidden', animationPlayState: 'paused' }) : undefined}
          data-test-subj={testSubj}
          position="fixed"
          color="accent"
          size="xs"
        />
      ) : (
        logo
      )}
    </>
  );
};
