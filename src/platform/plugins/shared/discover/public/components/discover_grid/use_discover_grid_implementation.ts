/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useState } from 'react';
import { useDiscoverServices } from '../../hooks/use_discover_services';
import {
  toDiscoverGridImplementation,
  type DiscoverGridImplementation,
} from './discover_grid_implementation';

/**
 * Returns the active grid implementation from the `discover.enableRdgTable` and
 * `discover.enableTanstackTable` feature flags.
 */
export const useDiscoverGridImplementation = (): DiscoverGridImplementation => {
  const { discoverFeatureFlags } = useDiscoverServices();
  const [implementation] = useState(() =>
    toDiscoverGridImplementation(
      discoverFeatureFlags.getEnableTanstackTable(),
      discoverFeatureFlags.getEnableRdgTable()
    )
  );
  return implementation;
};
