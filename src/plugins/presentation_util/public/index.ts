/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PresentationUtilPlugin } from './plugin';

export { PresentationUtilPluginSetup, PresentationUtilPluginStart } from './types';
export { SaveModalDashboardProps } from './components/types';
export { projectIDs, ProjectID, Project } from '../common/labs';

export {
  LazyLabsBeakerButton,
  LazyLabsFlyout,
  LazyDashboardPicker,
  LazySavedObjectSaveModalDashboard,
  withSuspense,
} from './components';

export {
  AddFromLibraryButton,
  PrimaryActionButton,
  PrimaryActionPopover,
  QuickButtonGroup,
  QuickButtonProps,
  SolutionToolbar,
  SolutionToolbarButton,
  SolutionToolbarPopover,
} from './components/solution_toolbar';

export function plugin() {
  return new PresentationUtilPlugin();
}
