/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ContainerInput } from './i_container';
// import { embeddableStart } from '../../kibana_services';

/**
 * Embeddable containers need to track the versions of all of their panels. This function
 * inspects all panels, and sets their versions to the latest versions. This is in anticipation
 * of the migration function being run in src/plugins/embeddable/public/lib/embeddables/default_embeddable_factory_provider.ts
 * which will bump all children to their latest version.
 */
export const initializePanelVersions = (
  panels: ContainerInput['panels']
): ContainerInput['panels'] => {
  return Object.values(panels).reduce<ContainerInput['panels']>((map, panel) => {
    // console.log(
    //   'initializing panel version to',
    //   embeddableStart.getEmbeddableFactory(panel.type)?.latestVersion
    // );
    // panel.explicitInput.version = embeddableStart.getEmbeddableFactory(panel.type)?.latestVersion;
    map[panel.explicitInput.id] = panel;
    return map;
  }, {});
};
