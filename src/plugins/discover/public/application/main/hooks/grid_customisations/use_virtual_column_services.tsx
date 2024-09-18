/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import createContainer from 'constate';
import type { DataView } from '@kbn/data-views-plugin/common';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';

export interface UseVirtualColumnServices {
  services: {
    data: DataPublicPluginStart;
    dataView: DataView;
  };
}

const useVirtualColumns = ({ services }: UseVirtualColumnServices) => services;

export const [VirtualColumnServiceProvider, useVirtualColumnServiceContext] =
  createContainer(useVirtualColumns);
