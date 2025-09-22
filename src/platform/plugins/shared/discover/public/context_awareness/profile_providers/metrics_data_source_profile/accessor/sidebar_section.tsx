/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { MetricsExperienceClient } from '@kbn/metrics-experience-plugin/public';
import { once } from 'lodash';
import type { SidebarToggleState } from '../../../../../application/types';
import type { DataSourceProfileProvider } from '../../../../profiles';

export const createSidebarToggleState = (
  metricsExperienceClient?: MetricsExperienceClient
): DataSourceProfileProvider['profile']['getSidebarToggleState'] =>
  once((prev: () => SidebarToggleState) =>
    once(() => {
      return {
        ...(prev ? prev() : {}),
        isCollapsed: true,
        toggle: undefined,
      };
    })
  );
