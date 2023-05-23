/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { NodeProps } from '../types';
import { useInitNavnode } from '../use_init_navnode';

function NavigationItemComp(node: NodeProps) {
  const { children } = node;
  const { navNode } = useInitNavnode(node);

  if (!navNode || !children) {
    return null;
  }

  return <>{children}</>;
}

export const NavigationItem = React.memo(NavigationItemComp);
