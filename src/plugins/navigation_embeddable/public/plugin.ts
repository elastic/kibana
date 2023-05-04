/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { EmbeddableSetup, EmbeddableStart } from '@kbn/embeddable-plugin/public';
import { NAVIGATION_EMBEDDABLE_TYPE } from './navigation_embeddable';
import { NavigationEmbeddableFactoryDefinition } from './navigation_embeddable';

export interface SetupDependencies {
  embeddable: EmbeddableSetup;
}

export interface StartDependencies {
  embeddable: EmbeddableStart;
}

export class NavigationEmbeddablePlugin
  implements Plugin<void, void, SetupDependencies, StartDependencies>
{
  constructor() {}

  public setup(core: CoreSetup<StartDependencies>, plugins: SetupDependencies) {
    plugins.embeddable.registerEmbeddableFactory(
      NAVIGATION_EMBEDDABLE_TYPE,
      new NavigationEmbeddableFactoryDefinition()
    );
  }

  public start(core: CoreStart, plugins: StartDependencies) {
    return {};
  }

  public stop() {}
}
