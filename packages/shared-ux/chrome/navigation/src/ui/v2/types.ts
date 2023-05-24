/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ChromeNavLink, ChromeProjectNavigationNode } from '@kbn/core-chrome-browser';
import { ReactNode } from 'react';

export interface InternalNavigationNode extends Omit<ChromeProjectNavigationNode, 'id' | 'link'> {
  id: string;
  title: string;
  deepLink?: ChromeNavLink;
}

export type UnRegisterFunction = () => void;

export type RegisterFunction = (navNode: InternalNavigationNode) => {
  unregister: UnRegisterFunction;
  path: string[];
};

export interface NodeProps {
  children?: ((deepLink?: ChromeNavLink) => ReactNode) | ReactNode;
  id?: string;
  title?: string;
  link?: string;
  // Temp to test removing nav nodes
  onRemove?: () => void;
}
