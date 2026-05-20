/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Global, css } from '@emotion/react';
import { EuiLoadingSpinner, EuiProgress, EuiImage } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useIsLoading } from './chrome_hooks';

export interface LoadingIndicatorProps {
  showAsBar?: boolean;
  customLogo?: string;
}

const HeartLogo = ({ size = 24, ...props }: { size?: number } & React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    {...props}
  >
    <path
      fill="#FEC514"
      stroke="#fff"
      strokeWidth="0.8"
      d="M16 7 C14.5 4.5 12 3 9.5 3 C5.5 3 2 6 2 10.5 C2 12.5 2.8 14.5 4.5 17 L16 7 Z"
    />
    <path
      fill="#02BCB7"
      stroke="#fff"
      strokeWidth="0.8"
      d="M4.5 17 C7 20.5 11 24.5 16 29 L16 7 L4.5 17 Z"
    />
    <path
      fill="#F04E98"
      stroke="#fff"
      strokeWidth="0.8"
      d="M16 7 C17.5 4.5 20 3 22.5 3 C26.5 3 30 6 30 10.5 C30 12.5 29.2 14.5 27.5 17 L16 7 Z"
    />
    <path
      fill="#0B64DD"
      stroke="#fff"
      strokeWidth="0.8"
      d="M27.5 17 C25 20.5 21 24.5 16 29 L16 7 L27.5 17 Z"
    />
    <path
      fill="#9ADC30"
      stroke="#fff"
      strokeWidth="0.8"
      d="M9.5 3 C5.5 3 2 6 2 10.5 C2 11 2.05 11.5 2.15 12 L16 7 C14.5 4.5 12 3 9.5 3 Z"
    />
    <path
      fill="#1BA9F5"
      stroke="#fff"
      strokeWidth="0.8"
      d="M22.5 3 C26.5 3 30 6 30 10.5 C30 11 29.95 11.5 29.85 12 L16 7 C17.5 4.5 20 3 22.5 3 Z"
    />
  </svg>
);

export const LoadingIndicator = ({ showAsBar = false, customLogo }: LoadingIndicatorProps) => {
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
    <span
      data-test-subj={testSubj}
      aria-label={i18n.translate('core.ui.chrome.headerGlobalNav.logoAriaLabel', {
        defaultMessage: 'Elastic Logo',
      })}
    >
      <HeartLogo size={24} />
    </span>
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
