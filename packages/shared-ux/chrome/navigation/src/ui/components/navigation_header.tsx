/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiHeaderLogo, EuiLoadingSpinner } from '@elastic/eui';
import useObservable from 'react-use/lib/useObservable';
import { useNavigation as useServices } from '../../services';
import { ElasticMark } from '../elastic_mark';
import { getI18nStrings } from '../i18n_strings';

import '../../header_logo.scss';

interface Props {
  homeHref: string;
}

export const NavHeader: FC<Props> = ({ homeHref }) => {
  const strings = getI18nStrings();
  const { basePath, navigateToUrl, loadingCount$ } = useServices();
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
        title="Elastic"
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
    <EuiFlexGroup gutterSize="none">
      <EuiFlexItem grow={false}>{logo}</EuiFlexItem>
      <EuiFlexItem css={{ paddingTop: '8px' }}>
        <ElasticMark className="chrHeaderLogo__mark" aria-hidden={true} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
