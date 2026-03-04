/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect } from 'react';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { DiscoverGlobalHeaderActionsContent } from './discover_global_header_actions';
import { useDiscoverServices } from '../../../hooks/use_discover_services';

/**
 * Registers Discover's global header actions (New, Share, Overflow, Save, ES|QL) with the chrome
 * when mounted, and clears them when unmounted or when navigating away.
 */
export const GlobalHeaderActionsMount: React.FC = () => {
  const { chrome, core } = useDiscoverServices();

  useEffect(() => {
    const mount = (element: HTMLDivElement) =>
      toMountPoint(<DiscoverGlobalHeaderActionsContent />, core)(element);
    chrome.setGlobalHeaderAppActions(mount);
    return () => {
      chrome.setGlobalHeaderAppActions(undefined);
    };
  }, [chrome, core]);

  return null;
};
