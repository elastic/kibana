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
import useObservable from 'react-use/lib/useObservable';
import { Observable } from 'rxjs';
import Url from 'url';
import { CustomBranding } from '@kbn/core-custom-branding-common';
import type { HttpStart } from '@kbn/core-http-browser';
import type { ChromeNavLink } from '@kbn/core-chrome-browser';
import { useEuiTheme } from '@elastic/eui';
import { ElasticMark } from './elastic_mark';
import { LoadingIndicator } from '../loading_indicator';

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
  forceNavigation: boolean,
  navLinks: ChromeNavLink[],
  navigateToApp: (appId: string) => void
) {
  const anchor = findClosestAnchor((event as any).nativeEvent.target);
  if (!anchor) {
    return;
  }

  if (event.isDefaultPrevented() || event.altKey || event.metaKey || event.ctrlKey) {
    return;
  }

  if (forceNavigation) {
    const toParsed = Url.parse(anchor.href);
    const fromParsed = Url.parse(document.location.href);
    const sameProto = toParsed.protocol === fromParsed.protocol;
    const sameHost = toParsed.host === fromParsed.host;
    const samePath = toParsed.path === fromParsed.path;

    if (sameProto && sameHost && samePath) {
      if (toParsed.hash) {
        document.location.reload();
      }

      // event.preventDefault() keeps the browser from seeing the new url as an update
      // and even setting window.location does not mimic that behavior, so instead
      // we use stopPropagation() to prevent angular from seeing the click and
      // starting a digest cycle/attempting to handle it in the router.
      event.stopPropagation();
    }
  } else {
    navigateToApp('home');
    event.preventDefault();
  }
}

interface Props {
  href: string;
  navLinks$: Observable<ChromeNavLink[]>;
  forceNavigation$: Observable<boolean>;
  navigateToApp: (appId: string) => void;
  loadingCount$?: ReturnType<HttpStart['getLoadingCount$']>;
  customBranding$: Observable<CustomBranding>;
}

export function HeaderLogo({ href, navigateToApp, loadingCount$, ...observables }: Props) {
  const { euiTheme } = useEuiTheme();
  const forceNavigation = useObservable(observables.forceNavigation$, false);
  const navLinks = useObservable(observables.navLinks$, []);
  const customBranding = useObservable(observables.customBranding$, {});
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
      onClick={(e) => onClick(e, forceNavigation, navLinks, navigateToApp)}
      css={styles.logoCss}
      href={href}
      data-test-subj="logo"
      aria-label={i18n.translate('core.ui.chrome.headerGlobalNav.goHomePageIconAriaLabel', {
        defaultMessage: 'Elastic home',
      })}
    >
      <LoadingIndicator loadingCount$={loadingCount$!} customLogo={logo} />
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
