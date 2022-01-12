/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, Plugin } from 'kibana/server';
import { EmbeddableSetup } from '../../embeddable/server';
import { controlGroupContainerPersistableStateServiceFactory } from './control_group/control_group_container_factory';
import { optionsListPersistableStateServiceFactory } from './control_types/options_list/options_list_embeddable_factory';

interface SetupDeps {
  embeddable: EmbeddableSetup;
}

export class ControlsPlugin implements Plugin<object, object, SetupDeps> {
  public setup(core: CoreSetup, plugins: SetupDeps) {
    plugins.embeddable.registerEmbeddableFactory(optionsListPersistableStateServiceFactory());

    plugins.embeddable.registerEmbeddableFactory(
      controlGroupContainerPersistableStateServiceFactory(plugins.embeddable)
    );
    return {};
  }

  public start() {
    return {};
  }

  public stop() {}
}
