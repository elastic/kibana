/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { IconType } from '@elastic/eui';
import { SideNavComponent as ISideNavComponent } from './project_navigation';
import type { ChromeStyle } from './types';

export interface Workflow {
  id: string;
  title: string;
  style: ChromeStyle;
  isDefault?: boolean;
  icon?: IconType;
  navigation?: ISideNavComponent;
}

export interface Workflows {
  [id: string]: Workflow;
}
