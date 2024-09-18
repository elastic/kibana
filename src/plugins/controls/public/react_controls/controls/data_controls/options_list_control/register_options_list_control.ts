/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { OPTIONS_LIST_CONTROL } from '../../../../../common';
import { untilPluginStartServicesReady } from '../../../../services/kibana_services';
import { registerControlFactory } from '../../../control_factory_registry';

export function registerOptionsListControl() {
  registerControlFactory(OPTIONS_LIST_CONTROL, async () => {
    const [{ getOptionsListControlFactory }] = await Promise.all([
      import('./get_options_list_control_factory'),
      untilPluginStartServicesReady(),
    ]);
    return getOptionsListControlFactory();
  });
}
