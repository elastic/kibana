/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Storage } from '@kbn/kibana-utils-plugin/public';
import { core, uiActions } from '../../kibana_services';
import { DrilldownManagerWithProvider } from './containers/drilldown_manager/drilldown_manager_with_provider';
import type { PublicDrilldownsManagerProps } from './types';

export { getDrilldownFactories } from './get_drilldown_factories';

export function DrilldownManager(props: PublicDrilldownsManagerProps) {
  return DrilldownManagerWithProvider({
    ...props,
    factories: props.factories.filter((factory) => {
      return factory.supportedTriggers.some((supportedTrigger) =>
        props.triggers.includes(supportedTrigger)
      );
    }),
    getTrigger: (triggerId) => uiActions.getTrigger(triggerId),
    storage: new Storage(window?.localStorage),
    toastService: core.notifications.toasts,
    docsLink: core.docLinks.links.dashboard.drilldowns,
    triggerPickerDocsLink: core.docLinks.links.dashboard.drilldownsTriggerPicker,
  });
}
