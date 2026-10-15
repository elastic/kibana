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

export interface ExampleLink {
  title: string;
  href: string;
  path: string;
}

interface NavProps {
  exampleLinks: ExampleLink[];
}

const SideNav: React.FC<NavProps> = ({ exampleLinks }: NavProps) => {
  const navItems = exampleLinks.map((example) => {
    return {
      id: example.path,
      name: example.title,
      'data-test-subj': example.path,
      href: example.href,
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
}

export const SearchExamplePage: React.FC<PropsWithChildren<Props>> = ({
  children,
  exampleLinks,
}) => {
  return (
    <EuiPageTemplate offset={0}>
      <EuiPageTemplate.Sidebar>
        <SideNav exampleLinks={exampleLinks} />
      </EuiPageTemplate.Sidebar>
      {children}
    </EuiPageTemplate>
  );
};
