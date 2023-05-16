/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { ReactNode, useEffect } from 'react';

import { useInitNavnode } from '../use_init_navnode';
import { useRegisterTreeNode } from './use_register_tree_node';

interface Props {
  children: ReactNode | string;
  id?: string;
  title?: string;
  link?: string;
}

export const NavigationItem = ({ children, id: _id, title: _title, link }: Props) => {
  const { id, title } = useInitNavnode({ id: _id, title: _title, link });
  const { register } = useRegisterTreeNode();

  useEffect(() => {
    register({ id, title, link });
  }, [register, id, title, link]);

  return <div>{children ?? title}</div>;
};
