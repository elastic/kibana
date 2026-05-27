/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PropsWithChildren } from 'react';
import React from 'react';
import { EuiPageTemplate, EuiSideNav } from '@elastic/eui';
import type { IBasePath } from '@kbn/core/public';
import { hasActiveModifierKey } from '@kbn/shared-ux-utility';
import { PLUGIN_ID } from '../../common';

export interface ExampleLink {
  title: string;
  path: string;
}

interface NavProps {
  exampleLinks: ExampleLink[];
  basePath: IBasePath;
  navigateToPath: (path: string) => void;
}

const SideNav: React.FC<NavProps> = ({ exampleLinks, basePath, navigateToPath }: NavProps) => {
  const navItems = exampleLinks.map((example) => {
    if (example.path.startsWith('http')) {
      return {
        id: example.path,
        name: example.title,
        'data-test-subj': example.path,
        href: example.path,
      };
    }

    return {
      id: example.path,
      name: example.title,
      'data-test-subj': example.path,
      href: basePath.prepend(`/app/${PLUGIN_ID}${example.path}`),
      onClick: (event: React.MouseEvent<HTMLAnchorElement>) => {
        if (hasActiveModifierKey(event)) return;
        event.preventDefault();
        navigateToPath(example.path);
      },
    };
  });

  return (
    <EuiSideNav
      items={[
        {
          name: 'Search Examples',
          id: 'home',
          items: [...navItems],
        },
      ]}
    />
  );
};

interface Props {
  exampleLinks: ExampleLink[];
  basePath: IBasePath;
  navigateToPath: (path: string) => void;
}

export const SearchExamplePage: React.FC<PropsWithChildren<Props>> = ({
  children,
  exampleLinks,
  basePath,
  navigateToPath,
}) => {
  return (
    <EuiPageTemplate offset={0}>
      <EuiPageTemplate.Sidebar>
        <SideNav exampleLinks={exampleLinks} basePath={basePath} navigateToPath={navigateToPath} />
      </EuiPageTemplate.Sidebar>
      {children}
    </EuiPageTemplate>
  );
};
