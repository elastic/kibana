/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css, Global } from '@emotion/react';
import { EuiIcon, EuiImage, EuiLoadingSpinner, EuiProgress } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import classNames from 'classnames';
import { debounceTime, distinctUntilChanged, map } from 'rxjs';

import { useChromeObservable } from '../store';

export interface LoadingIndicatorProps {
  showAsBar?: boolean;
  customLogo?: string;
  maxAmount?: number;
  valueAmount?: string | number;
}

export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  showAsBar = false,
  customLogo,
  maxAmount,
  valueAmount,
}) => {
  const isLoading = useChromeObservable(
    (state) =>
      state.loadingCount$.pipe(
        map((count) => count > 0),
        distinctUntilChanged(),
        debounceTime(250) // Debounce to avoid flickering
      ),
    false
  );
  console.log('LoadingIndicator rendered with isLoading:', isLoading);

  const className = classNames(!isLoading && 'kbnLoadingIndicator-hidden');
  const indicatorHiddenCss = !isLoading
    ? css({
        visibility: 'hidden',
        animationPlayState: 'paused',
      })
    : undefined;

  const testSubj = isLoading ? 'globalLoadingIndicator' : 'globalLoadingIndicator-hidden';

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
            // stop global header buttons from jumping during loading state
            display: 'flex',
          },
        }}
      />
      {!showAsBar ? (
        logo
      ) : (
        <EuiProgress
          className={className}
          css={indicatorHiddenCss}
          data-test-subj={testSubj}
          max={maxAmount}
          value={valueAmount}
          position="fixed"
          color="accent"
          size="xs"
        />
      )}
    </>
  );
};
