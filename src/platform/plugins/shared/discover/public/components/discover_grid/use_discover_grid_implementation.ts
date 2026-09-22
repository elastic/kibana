/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Storage } from '@kbn/kibana-utils-plugin/public';
import { useCallback, useState } from 'react';
import {
  getDiscoverGridImplementation,
  setDiscoverGridImplementation,
  type DiscoverGridImplementation,
} from './discover_grid_implementation';

export const useDiscoverGridImplementation = (storage: Storage, consumer = 'discover') => {
  const [implementation, setImplementation] = useState<DiscoverGridImplementation>(() =>
    getDiscoverGridImplementation(storage, consumer)
  );

  const onChangeImplementation = useCallback(
    (newImplementation: DiscoverGridImplementation) => {
      setDiscoverGridImplementation(storage, newImplementation, consumer);
      setImplementation(newImplementation);
    },
    [storage, consumer]
  );

  const toggleImplementation = useCallback(() => {
    onChangeImplementation(implementation === 'unified' ? 'tanstack' : 'unified');
  }, [implementation, onChangeImplementation]);

  return {
    implementation,
    usesUnifiedDataTable: implementation === 'unified',
    onChangeImplementation,
    toggleImplementation,
  };
};
