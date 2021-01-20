/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { getAngularModule } from '../../../../../kibana_services';
import { ActionBar } from './action_bar';

getAngularModule().directive('contextActionBar', function (reactDirective: any) {
  return reactDirective(ActionBar);
});
