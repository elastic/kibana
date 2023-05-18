/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ChromeNavLink, ChromeProjectNavigationNode } from '@kbn/core-chrome-browser';
import { ReactNode } from 'react';

export interface InternalNavigationNode extends Omit<ChromeProjectNavigationNode, 'id'> {
  id: string;
  title: string;
  /** Flag to indicate if the deepLink id has been found and we should render the node in the UI */
  isLinkActive: boolean;
  /** Current state of the navigation node. "active" means it matches the current URL route */
  status: 'idle' | 'active';
  deepLink?: ChromeNavLink;
}

export type UnRegisterFunction = () => void;

export type RegisterFunction = (navNode: InternalNavigationNode) => UnRegisterFunction;

export interface NodeProps {
  children?: ((deepLink?: ChromeNavLink) => ReactNode) | ReactNode;
  id?: string;
  title?: string;
  link?: string;
  // Temp to test removing nav nodes
  onRemove?: () => void;
}
