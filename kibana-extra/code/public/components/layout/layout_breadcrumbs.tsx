/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBreadcrumbs } from '@elastic/eui';
import React from 'react';
import { FileListDropdown } from './filelist_dropdown';
import { VersionDropDown } from './version_dropdown';

interface Props {
  routeParams: { [key: string]: string };
}
export class LayoutBreadcrumbs extends React.PureComponent<Props> {
  public render() {
    const { resource, org, repo, revision, path, pathType } = this.props.routeParams;
    const repoUri = `${resource}/${org}/${repo}`;

    const breadcrumbs = [
      {
        text: resource,
        href: '#',
      },
      {
        text: org,
        href: '#',
      },
      {
        text: repo,
        href: `#${resource}/${org}/${repo}/tree/master`,
      },
      {
        text: <VersionDropDown head={revision} repoUri={repoUri} path={path} pathType={pathType} />,
      },
    ];
    const pathSegments = path ? path.split('/') : [];

    pathSegments.forEach((p, index) => {
      breadcrumbs.push({
        text: (
          <FileListDropdown
            revision={revision}
            repoUri={repoUri}
            paths={pathSegments.slice(0, index + 1)}
          />
        ),
      });
    });
    return <EuiBreadcrumbs max={Number.MAX_VALUE} truncate={false} breadcrumbs={breadcrumbs} />;
  }
}
