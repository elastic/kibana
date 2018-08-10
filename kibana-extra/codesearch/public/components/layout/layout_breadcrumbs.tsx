/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
// @ts-ignore
import { EuiBreadcrumbs } from '../eui/breadcrumbs/breadcrumbs';
import { FileListDropdown } from './filelist_dropdown';
import { VersionDropDown } from './version_dropdown';

interface Props {
  routeParams: { [key: string]: string };
}
export class LayoutBreadcrumbs extends React.PureComponent<Props> {
  public render() {
    const { resource, org, repo, revision, path, goto, pathType } = this.props.routeParams;
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
        href: `#${resource}/${org}/${repo}/HEAD`,
      },
      {
        text: '',
        component: (
          <VersionDropDown head={revision} repoUri={repoUri} path={path} pathType={pathType} />
        ),
      },
    ];
    const pathSegments = path ? path.split('/') : [];
    const baseUri = `#/${repoUri}/${revision}/`;

    pathSegments.forEach((p, index) => {
      const isLast = index === pathSegments.length - 1;
      if (isLast) {
        breadcrumbs.push({
          text: p || '',
          href: baseUri + pathSegments.join('/') + '!' + goto,
        });
      } else {
        breadcrumbs.push({
          text: '',
          component: (
            <FileListDropdown baseUri={baseUri} paths={pathSegments.slice(0, index + 1)} />
          ),
        });
      }
    });
    return <EuiBreadcrumbs max={Number.MAX_VALUE} truncate={false} breadcrumbs={breadcrumbs} />;
  }
}
