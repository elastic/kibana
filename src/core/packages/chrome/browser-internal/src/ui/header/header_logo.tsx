/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useEuiTheme } from '@elastic/eui';
import { ElasticMark } from './elastic_mark';
import { LoadingIndicator } from '../loading_indicator';
import { useChromeObservable } from '../../store';

function findClosestAnchor(element: HTMLElement): HTMLAnchorElement | void {
  let current = element;
  while (current) {
    if (current.tagName === 'A') {
      return current as HTMLAnchorElement;
    }

    if (!current.parentElement || current.parentElement === document.body) {
      return undefined;
    }

    current = current.parentElement;
  }
}

function onClick(
  event: React.MouseEvent<HTMLAnchorElement>,
  navigateToApp: (appId: string) => void
) {
  const anchor = findClosestAnchor((event as any).nativeEvent.target);
  if (!anchor) {
    return;
  }

  if (event.isDefaultPrevented() || event.altKey || event.metaKey || event.ctrlKey) {
    return;
  }

  navigateToApp('home');
  event.preventDefault();
}

interface Props {
  href: string;
  navigateToApp: (appId: string) => void;
}

export function HeaderLogo({ href, navigateToApp }: Props) {
  const { euiTheme } = useEuiTheme();
  const customBranding = useChromeObservable((state) => state.customBranding$, {});
  const { customizedLogo, logo } = customBranding;

  const styles = {
    logoCss: css({
      display: 'flex',
      alignItems: 'center',
      height: euiTheme.size.xxl,
      paddingInline: euiTheme.size.s,
    }),
    logoMarkCss: css({
      marginLeft: euiTheme.size.s,
      fill: euiTheme.colors.ghost,
    }),
  };

  return (
    <a
      onClick={(e) => onClick(e, navigateToApp)}
      css={styles.logoCss}
      href={href}
      data-test-subj="logo"
      aria-label={i18n.translate('core.ui.chrome.headerGlobalNav.goHomePageIconAriaLabel', {
        defaultMessage: 'Elastic home',
      })}
    >
      <LoadingIndicator customLogo={logo} />
      {customizedLogo ? (
        <img
          src={customizedLogo}
          data-test-subj="logoMark"
          css={styles.logoMarkCss}
          style={{ maxWidth: '200px', maxHeight: '84px' }}
          alt="custom mark"
        />
      ) : (
        <ElasticMark data-test-subj="logoMark" css={styles.logoMarkCss} aria-hidden={true} />
      )}
    </a>
  );
}
