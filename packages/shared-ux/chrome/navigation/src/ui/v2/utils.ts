/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { ChromeNavLink } from '@kbn/core-chrome-browser';
import { NodeProps } from './types';

export const getIdFromNavigationNode = ({ id: _id, link, title }: NodeProps): { id: string } => {
  const id = _id ?? link;

  if (!id) {
    throw new Error(`Id or link prop missing for navigation item [${title}]`);
  }

  return { id };
};

export const getDeepLinkFromNavigationNode = (
  { link }: { link?: string },
  { deepLinks }: { deepLinks: Readonly<ChromeNavLink[]> }
): ChromeNavLink | undefined => {
  return deepLinks.find((dl) => dl.id === link);
};

export const getTitleForNavigationNode = (
  {
    title: _title = '',
  }: {
    title?: string;
    id: string;
    link?: string;
  },
  { deepLink }: { deepLink?: ChromeNavLink }
): { title: string } => {
  let title = _title;

  if (title.trim().length === 0) {
    title = deepLink?.title ?? '';
  }
  return { title };
};

export const doRenderNode = ({ link, deepLink }: { link?: string; deepLink?: ChromeNavLink }) => {
  if (link && !deepLink) {
    // If a link is provided, but no deepLink is found, don't render anything
    return false;
  }
  return true;
};
