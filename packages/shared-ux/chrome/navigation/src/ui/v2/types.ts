/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ChromeNavLink, ChromeProjectNavigationNode } from '@kbn/core-chrome-browser';
import type { ReactNode } from 'react';

export interface InternalNavigationNode
  extends Omit<ChromeProjectNavigationNode, 'id' | 'link' | 'children'> {
  id: string;
  title: string;
  path: string[];
  deepLink?: ChromeNavLink;
  children?: InternalNavigationNode[];
  itemRender?: () => JSX.Element;
}

export type UnRegisterFunction = (id: string) => void;

export type RegisterFunction = (navNode: InternalNavigationNode) => {
  unregister: UnRegisterFunction;
  path: string[];
};

export interface NodeProps {
  children?: ((deepLink?: ChromeNavLink) => ReactNode) | ReactNode;
  id?: string;
  title?: string;
  link?: string;
  icon?: string;
}
