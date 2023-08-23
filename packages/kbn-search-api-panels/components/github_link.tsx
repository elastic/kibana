/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText, EuiLink } from '@elastic/eui';
import { HttpStart } from '@kbn/core-http-browser';

export const GithubLink: React.FC<{
  label: string;
  href: string;
  http: HttpStart;
  pluginId: string;
}> = ({ label, href, http, pluginId }) => {
  return (
    <EuiFlexGroup alignItems="center" gutterSize="xs" justifyContent="flexEnd">
      <EuiFlexItem grow={false}>
        <EuiIcon size="s" type={http.basePath.prepend(`/plugins/${pluginId}/assets/github.svg`)} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="s">
          <EuiLink target="_blank" href={href}>
            {label}
          </EuiLink>
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
