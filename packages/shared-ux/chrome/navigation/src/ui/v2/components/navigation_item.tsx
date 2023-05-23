/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Fragment } from 'react';

import { NodeProps } from '../types';
import { useInitNavnode } from '../use_init_navnode';

interface Props extends NodeProps {
  element?: string;
  unstyled?: boolean;
  itemRender?: () => React.ReactNode;
}

function NavigationItemComp(props: Props) {
  const { element, unstyled = false, children, ...node } = props;
  const { navNode } = useInitNavnode(node);

  if (!navNode || !unstyled) {
    return null;
  }

  if (children) {
    return <>{children}</>;
  }

  const Element = element || Fragment;

  return <Element>{navNode.title}</Element>;
}

export const NavigationItem = React.memo(NavigationItemComp);
