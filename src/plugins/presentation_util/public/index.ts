/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { PresentationUtilPlugin } from './plugin';

export {
  SavedObjectSaveModalDashboard,
  DashboardSaveModalProps,
} from './components/saved_object_save_modal_dashboard';

export function plugin() {
  return new PresentationUtilPlugin();
}
export { PresentationUtilPluginSetup, PresentationUtilPluginStart } from './types';
