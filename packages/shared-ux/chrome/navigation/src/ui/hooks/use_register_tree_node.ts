/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useMemo } from 'react';

import { useNavigation } from '../components/navigation';
import { useNavigationGroup } from '../components/navigation_group';

/**
 * Helper hook that will proxy the correct "register" handler.
 * It first tries to the closest parent group, if not found it will use the root register.
 */
export const useRegisterTreeNode = () => {
  const root = useNavigation();
  const group = useNavigationGroup(false);
  const register = group ? group.register : root.register;

  return useMemo(
    () => ({
      register,
    }),
    [register]
  );
};
