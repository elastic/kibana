/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { NavigationPublicPluginStart } from '../../../../src/plugins/navigation/public';
import { DataPublicPluginStart } from '../../../../src/plugins/data/public';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface StateDemoPublicPluginSetup {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface StateDemoPublicPluginStart {}

export interface AppPluginDependencies {
  data: DataPublicPluginStart;
  navigation: NavigationPublicPluginStart;
}
