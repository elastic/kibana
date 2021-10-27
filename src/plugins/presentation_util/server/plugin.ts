/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, Plugin } from 'kibana/server';
import { EmbeddableSetup } from '../../embeddable/server';
import { controlGroupContainerPersistableStateServiceFactory } from './controls/control_group/control_group_container_factory';
import { optionsListPersistableStateServiceFactory } from './controls/control_types/options_list/options_list_embeddable_factory';
import { getUISettings } from './ui_settings';

interface SetupDeps {
  embeddable: EmbeddableSetup;
}

export class PresentationUtilPlugin implements Plugin<object, object, SetupDeps> {
  public setup(core: CoreSetup, plugins: SetupDeps) {
    core.uiSettings.register(getUISettings());

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
