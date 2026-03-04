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
import React, { useState, useEffect, useRef } from 'react';
import classNames from 'classnames';
import type { HttpStart } from '@kbn/core-http-browser';

const DEBOUNCE_DELAY_MS = 250;

export interface LoadingIndicatorProps {
  loadingCount$: ReturnType<HttpStart['getLoadingCount$']>;
  showAsBar?: boolean;
  customLogo?: string;
  maxAmount?: number;
  valueAmount?: string | number;
}

export const LoadingIndicator = ({
  loadingCount$,
  showAsBar = false,
  customLogo,
  maxAmount,
  valueAmount,
}: LoadingIndicatorProps) => {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const subscription = loadingCount$.subscribe((count) => {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setVisible(count > 0);
      }, DEBOUNCE_DELAY_MS);
    });

    return () => {
      clearTimeout(timerRef.current);
      subscription.unsubscribe();
    };
  }, [loadingCount$]);

  const className = classNames(!visible && 'kbnLoadingIndicator-hidden');
  const indicatorHiddenCss = !visible
    ? css({
        visibility: 'hidden',
        animationPlayState: 'paused',
      })
    : undefined;

  const testSubj = visible ? 'globalLoadingIndicator' : 'globalLoadingIndicator-hidden';

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

  const logo = visible ? (
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
