/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type HasAppContext } from '@kbn/presentation-publishing';
import type { TracksOverlays } from '@kbn/presentation-util';
import useAsync from 'react-use/lib/useAsync';
import { useEffect, useMemo, useState } from 'react';
import { getMenuItemGroups } from './get_menu_item_groups';

export const useMenuItemGroups = (api: HasAppContext & TracksOverlays) => {
  const { value, loading, error } = useAsync(async () => {
    return await getMenuItemGroups(api);
  }, [api]);
  const { groups$, cleanup } = value ?? { groups$: undefined };
  const [groups, setGroups] = useState(groups$?.getValue());

  const groupSubscription = useMemo(() => {
    if (groups$) {
      return groups$.subscribe((nextGroups) => setGroups(nextGroups));
    }
  }, [groups$]);

  useEffect(
    () => () => {
      cleanup?.();
      groupSubscription?.unsubscribe();
    },
    [cleanup, groupSubscription]
  );

  return { groups, loading, error };
};
