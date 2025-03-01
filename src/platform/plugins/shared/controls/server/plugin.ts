/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup, Plugin } from '@kbn/core/server';
import type { PluginSetup as DataSetup } from '@kbn/data-plugin/server';
import type { EmbeddableRegistryDefinition } from '@kbn/embeddable-plugin/server';
import type { PluginSetup as UnifiedSearchSetup } from '@kbn/unified-search-plugin/server';
import type {
  EmbeddableFactoryRegistry,
  EmbeddableRegistryItem,
} from '@kbn/embeddable-plugin/server/types';
import { setupOptionsListSuggestionsRoute } from './options_list/options_list_suggestions_route';
import { controlGroupContainerPersistableStateServiceFactory } from './control_group/control_group_container_factory';
import { optionsListPersistableStateServiceFactory } from './options_list/options_list_embeddable_factory';
import { rangeSliderPersistableStateServiceFactory } from './range_slider/range_slider_embeddable_factory';
import { timeSliderPersistableStateServiceFactory } from './time_slider/time_slider_embeddable_factory';
import { esqlStaticControlPersistableStateServiceFactory } from './esql_control/esql_control_factory';
import { setupOptionsListClusterSettingsRoute } from './options_list/options_list_cluster_settings_route';
import { ControlsSetup, ControlsStart } from './types';

interface SetupDeps {
  data: DataSetup;
  unifiedSearch: UnifiedSearchSetup;
}

export class ControlsPlugin implements Plugin<ControlsSetup, ControlsStart, SetupDeps> {
  private readonly controlsFactories: EmbeddableFactoryRegistry = new Map();

  public setup(core: CoreSetup, { unifiedSearch }: SetupDeps) {
    this.registerControlsFactory(optionsListPersistableStateServiceFactory());
    this.registerControlsFactory(rangeSliderPersistableStateServiceFactory());
    this.registerControlsFactory(timeSliderPersistableStateServiceFactory());
    this.registerControlsFactory(esqlStaticControlPersistableStateServiceFactory());

    setupOptionsListClusterSettingsRoute(core);
    setupOptionsListSuggestionsRoute(core, unifiedSearch.autocomplete.getAutocompleteSettings);
    return controlGroupContainerPersistableStateServiceFactory(this.getControlsFactory);
  }

  public start() {
    return controlGroupContainerPersistableStateServiceFactory(this.getControlsFactory);
  }

  public stop() {}

  private registerControlsFactory = (factory: EmbeddableRegistryDefinition) => {
    if (this.controlsFactories.has(factory.id)) {
      throw new Error(`Control factory with id ${factory.id} already exists`);
    }

    this.controlsFactories.set(factory.id, {
      id: factory.id,
      telemetry: factory.telemetry ?? ((state, stats) => stats),
      inject: factory.inject ?? ((state) => state),
      extract: factory.extract ?? ((state) => ({ state, references: [] })),
      migrations: factory.migrations ?? {},
    });
  };

  private getControlsFactory = (controlsFactoryId: string): EmbeddableRegistryItem => {
    return (
      this.controlsFactories.get(controlsFactoryId) ?? {
        id: controlsFactoryId,
        telemetry: (state, stats) => stats,
        inject: (state) => state,
        extract: (state) => ({ state, references: [] }),
        migrations: {},
      }
    );
  };
}
