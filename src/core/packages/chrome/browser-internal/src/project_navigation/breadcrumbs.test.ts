/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  ChromeBreadcrumb,
  ChromeProjectNavigationNode,
  CloudLinks,
} from '@kbn/core-chrome-browser/src';
import { buildBreadcrumbs } from './breadcrumbs';

describe('buildBreadcrumbs', () => {
  const mockCloudLinks = {
    deployment: { href: '/deployment' },
    deployments: { href: '/deployments', title: 'All Deployments' },
  } as CloudLinks;

  it('returns breadcrumbs with root crumb when absolute is true', () => {
    const projectBreadcrumbs = {
      breadcrumbs: [{ text: 'Project Crumb', href: '/project' }],
      params: { absolute: true },
    };
    const result = buildBreadcrumbs({
      kibanaName: 'Test Project',
      cloudLinks: mockCloudLinks,
      projectBreadcrumbs,
      activeNodes: [],
      chromeBreadcrumbs: [],
      isServerless: true,
    });

    expect(result).toEqual([
      expect.objectContaining({
        text: 'Test Project',
      }),
      ...projectBreadcrumbs.breadcrumbs,
    ]);
  });

  it('builds breadcrumbs from activeNodes when no project breadcrumbs are set', () => {
    const activeNodes = [
      [
        { title: 'Node 1', breadcrumbStatus: 'visible', href: '/node1' },
        { title: 'Node 2', breadcrumbStatus: 'visible', href: '/node2' },
      ],
    ] as ChromeProjectNavigationNode[][];
    const result = buildBreadcrumbs({
      cloudLinks: mockCloudLinks,
      projectBreadcrumbs: { breadcrumbs: [], params: { absolute: false } },
      activeNodes,
      chromeBreadcrumbs: [],
      isServerless: false,
    });

    expect(result).toEqual([
      expect.objectContaining({
        text: 'Deployment',
      }),
      { text: 'Node 1', href: '/node1' },
      { text: 'Node 2', href: '/node2' },
    ]);
  });

  it('merges chromeBreadcrumbs and navBreadcrumbs based on deepLinkId', () => {
    const activeNodes = [
      [
        { title: 'Node 1', breadcrumbStatus: 'visible', href: '/node1', deepLink: { id: '1' } },
        { title: 'Node 2', breadcrumbStatus: 'visible', href: '/node2', deepLink: { id: '2' } },
      ],
    ] as ChromeProjectNavigationNode[][];
    const chromeBreadcrumbs = [
      { text: 'Chrome Crumb 1', href: '/chrome1', deepLinkId: '2' },
      { text: 'Chrome Crumb 2', href: '/chrome2' },
    ] as ChromeBreadcrumb[];
    const result = buildBreadcrumbs({
      cloudLinks: mockCloudLinks,
      projectBreadcrumbs: { breadcrumbs: [], params: { absolute: false } },
      activeNodes,
      chromeBreadcrumbs,
      isServerless: false,
    });

    expect(result).toEqual([
      expect.objectContaining({
        text: 'Deployment',
      }),
      { text: 'Node 1', href: '/node1', deepLinkId: '1' },
      { text: 'Chrome Crumb 1', href: '/chrome1', deepLinkId: '2' },
      { text: 'Chrome Crumb 2', href: '/chrome2' },
    ]);
  });

  it('returns breadcrumbs without root crumb if kibanaName/cloudLinks is empty', () => {
    const activeNodes = [
      [
        { title: 'Node 1', breadcrumbStatus: 'visible', href: '/node1', deepLink: { id: '1' } },
        { title: 'Node 2', breadcrumbStatus: 'visible', href: '/node2', deepLink: { id: '2' } },
      ],
    ] as ChromeProjectNavigationNode[][];
    const chromeBreadcrumbs = [
      { text: 'Chrome Crumb 1', href: '/chrome1', deepLinkId: '2' },
      { text: 'Chrome Crumb 2', href: '/chrome2' },
    ] as ChromeBreadcrumb[];
    const result = buildBreadcrumbs({
      kibanaName: undefined,
      cloudLinks: {},
      projectBreadcrumbs: { breadcrumbs: [], params: { absolute: false } },
      activeNodes,
      chromeBreadcrumbs,
      isServerless: false,
    });

    expect(result).toEqual([
      { text: 'Node 1', href: '/node1', deepLinkId: '1' },
      { text: 'Chrome Crumb 1', href: '/chrome1', deepLinkId: '2' },
      { text: 'Chrome Crumb 2', href: '/chrome2' },
    ]);
  });
});
