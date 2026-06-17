/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable } from 'rxjs';
import type { CoreStart } from '@kbn/core/public';
import type { NavExtensionData, NavExtensionId } from '@kbn/core-chrome-browser';
import type { DashboardSetupDependencies } from '../plugin';
import type { DashboardNavExtension } from './types';
import { dashboardNavExtensions } from './extensions';

export const registerNavExtensions = ({
  navigation,
}: Pick<DashboardSetupDependencies, 'navigation'>) => {
  const boundFactories = new Map<string, () => Observable<NavExtensionData<NavExtensionId>>>();

  const registerExtension = <Id extends NavExtensionId>(extension: DashboardNavExtension<Id>) => {
    const { id } = extension.definition;

    navigation.registerNavigationExtension(extension.definition, () => {
      const factory = boundFactories.get(id);
      if (!factory) {
        throw new Error(`${id}: createData$ called before dashboard plugin start()`);
      }
      return factory() as Observable<NavExtensionData<Id>>;
    });
  };

  for (const extension of dashboardNavExtensions) {
    registerExtension(extension);
  }

  return {
    start: (core: CoreStart) => {
      for (const extension of dashboardNavExtensions) {
        boundFactories.set(extension.definition.id, () => extension.createData$(core));
      }
    },
  };
};
