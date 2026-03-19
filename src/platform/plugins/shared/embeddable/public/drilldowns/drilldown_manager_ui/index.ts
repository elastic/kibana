/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Storage } from '@kbn/kibana-utils-plugin/public';
import { createElement } from 'react';
import type { EmbeddableApiContext } from '@kbn/presentation-publishing';
import { core, uiActions } from '../../kibana_services';
import { DrilldownManagerWithProvider } from './containers/drilldown_manager/drilldown_manager_with_provider';
import type { DrilldownRegistryEntry, HasDrilldowns } from '../types';
import type { DrilldownsManagerDeps } from './state';
import { getCompatibleFactories } from './get_compatible_factories';
import { getSiblingDrilldowns } from './get_sibling_drilldowns';

export async function getDrilldownManagerUi(
  props: HasDrilldowns &
    Pick<
      DrilldownsManagerDeps,
      'initialRoute' | 'onClose' | 'setupContext' | 'triggers' | 'templates' | 'closeAfterCreate'
    > & {
      entries: DrilldownRegistryEntry[];
    }
) {
  const { entries, ...rest } = props;

  const factories = await getCompatibleFactories(entries, props.setupContext, props.triggers);
  const templates = (props.setupContext as { embeddable?: unknown }).embeddable
    ? getSiblingDrilldowns(
        (props.setupContext as EmbeddableApiContext).embeddable,
        factories.map(({ type }) => type)
      )
    : [];

  return createElement(DrilldownManagerWithProvider, {
    ...rest,
    factories,
    templates,
    getTrigger: (triggerId) => uiActions.getTrigger(triggerId),
    storage: new Storage(window?.localStorage),
    toastService: core.notifications.toasts,
    docsLink: core.docLinks.links.dashboard.drilldowns,
    triggerPickerDocsLink: core.docLinks.links.dashboard.drilldownsTriggerPicker,
  });
}
