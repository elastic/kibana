/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiHeaderLogo, EuiLoadingSpinner } from '@elastic/eui';
import React from 'react';
import useObservable from 'react-use/lib/useObservable';
import { NavigationProps, NavigationServices } from '../../../types';
import { getI18nStrings } from '../../i18n_strings';
import { ElasticMark } from './elastic_mark';
import './header_logo.scss';

type Props = Pick<NavigationProps, 'homeHref'>;
type Services = Pick<
  NavigationServices,
  'basePath' | 'navIsOpen' | 'navigateToUrl' | 'loadingCount$'
>;

export const NavHeader = (props: Props & Services) => {
  const strings = getI18nStrings();
  const { basePath, navIsOpen, navigateToUrl, loadingCount$, homeHref } = props;

  const loadingCount = useObservable(loadingCount$, 0);
  const homeUrl = basePath.prepend(homeHref);
  const navigateHome = (event: React.MouseEvent) => {
    event.preventDefault();
    navigateToUrl(homeUrl);
  };
  const logo =
    loadingCount === 0 ? (
      <EuiHeaderLogo
        iconType="logoElastic"
        aria-label={strings.headerLogoAriaLabel}
        onClick={navigateHome}
        data-test-subj="nav-header-logo"
      />
    ) : (
      <a href={homeUrl} onClick={navigateHome}>
        <EuiLoadingSpinner
          size="l"
          aria-hidden={false}
          onClick={navigateHome}
          data-test-subj="nav-header-loading-spinner"
        />
      </a>
    );

  return (
    <>
      {logo}
      {navIsOpen ? <ElasticMark className="chrHeaderLogo__mark" aria-hidden={true} /> : null}
    </>
  );
};
