/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { ReactNode } from 'react-markdown';
import type { CoreStart } from '@kbn/core/public';
import type { UsageCollectionStart } from '@kbn/usage-collection-plugin/public';

export interface RemoteConsoleProps {
  /**
   * Set element displayed at the right of the remote console header.
   */
  headerRightSideItem?: ReactNode;
  /**
   * The default height of the content area.
   */
  size?: 's' | 'm' | 'l';
}

export interface RemoteConsoleDependencies {
  core: CoreStart;
  usageCollection?: UsageCollectionStart;
}
