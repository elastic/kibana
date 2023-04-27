/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiCollapsibleNavGroup, EuiLink } from '@elastic/eui';
import React from 'react';
import { NavigationProps } from '../../../types';
import { getI18nStrings } from '../../i18n_strings';

interface Props {
  linkToCloud?: NavigationProps['homeHref'];
}

export const LinkToCloud = (props: Props) => {
  const strings = getI18nStrings();

  switch (props.linkToCloud) {
    case 'projects':
      return (
        <EuiLink
          href="https://cloud.elastic.co/projects"
          color="text"
          data-test-subj="nav-header-link-to-projects"
        >
          <EuiCollapsibleNavGroup iconType="spaces" title={strings.linkToCloudProjects} />
        </EuiLink>
      );
    case 'deployments':
      return (
        <EuiLink
          href="https://cloud.elastic.co/deployments"
          color="text"
          data-test-subj="nav-header-link-to-deployments"
        >
          <EuiCollapsibleNavGroup iconType="spaces" title={strings.linkToCloudDeployments} />
        </EuiLink>
      );
    default:
      return null;
  }
};
