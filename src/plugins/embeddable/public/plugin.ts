/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import { UiActionsSetup } from 'src/plugins/ui_actions/public';
import { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from '../../../core/public';
import { EmbeddableFactoryRegistry, EmbeddableFactoryProvider } from './types';
import { bootstrap } from './bootstrap';
import {
  EmbeddableFactory,
  EmbeddableInput,
  EmbeddableOutput,
  defaultEmbeddableFactoryProvider,
  IEmbeddable,
} from './lib';
import { EmbeddableFactoryDefinition } from './lib/embeddables/embeddable_factory_definition';

export interface EmbeddableSetupDependencies {
  uiActions: UiActionsSetup;
}

export interface EmbeddableSetup {
  registerEmbeddableFactory: <I extends EmbeddableInput, O extends EmbeddableOutput>(
    id: string,
    factory: EmbeddableFactoryDefinition<I, O>
  ) => void;
  setEmbeddableFactoryProvider: (provider: EmbeddableFactoryProvider) => void;
}

export interface EmbeddableStart {
  getEmbeddableFactory: <
    I extends EmbeddableInput = EmbeddableInput,
    O extends EmbeddableOutput = EmbeddableOutput,
    E extends IEmbeddable<I, O> = IEmbeddable<I, O>
  >(
    embeddableFactoryId: string
  ) => EmbeddableFactory<I, O, E> | undefined;
  getEmbeddableFactories: () => IterableIterator<EmbeddableFactory>;
}

export class EmbeddablePublicPlugin implements Plugin<EmbeddableSetup, EmbeddableStart> {
  private readonly embeddableFactoryDefinitions: Map<
    string,
    EmbeddableFactoryDefinition
  > = new Map();
  private readonly embeddableFactories: EmbeddableFactoryRegistry = new Map();
  private embeddableFactoryProvider?: EmbeddableFactoryProvider;

  constructor(initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup, { uiActions }: EmbeddableSetupDependencies) {
    bootstrap(uiActions);

    return {
      registerEmbeddableFactory: this.registerEmbeddableFactory,
      setEmbeddableFactoryProvider: (provider: EmbeddableFactoryProvider) => {
        if (this.embeddableFactoryProvider) {
          throw new Error(
            'Custom embeddable factory provider is already set, and can only be set once'
          );
        }
        this.embeddableFactoryProvider = provider;
      },
    };
  }

  public start(core: CoreStart): EmbeddableStart {
    this.embeddableFactoryDefinitions.forEach(def => {
      this.embeddableFactories.set(
        def.type,
        this.embeddableFactoryProvider
          ? this.embeddableFactoryProvider(def)
          : defaultEmbeddableFactoryProvider(def)
      );
    });
    return {
      getEmbeddableFactory: this.getEmbeddableFactory,
      getEmbeddableFactories: () => this.embeddableFactories.values(),
    };
  }

  public stop() {}

  private registerEmbeddableFactory = (
    embeddableFactoryId: string,
    factory: EmbeddableFactoryDefinition
  ) => {
    if (this.embeddableFactoryDefinitions.has(embeddableFactoryId)) {
      throw new Error(
        `Embeddable factory [embeddableFactoryId = ${embeddableFactoryId}] already registered in Embeddables API.`
      );
    }
    this.embeddableFactoryDefinitions.set(embeddableFactoryId, factory);
  };

  private getEmbeddableFactory = <
    I extends EmbeddableInput = EmbeddableInput,
    O extends EmbeddableOutput = EmbeddableOutput,
    E extends IEmbeddable<I, O> = IEmbeddable<I, O>
  >(
    embeddableFactoryId: string
  ): EmbeddableFactory<I, O, E> => {
    let factory = this.embeddableFactories.get(embeddableFactoryId);

    if (!factory) {
      // This is only needed for legacy plugins registering embeddable factories after this start method.
      const def = this.embeddableFactoryDefinitions.get(embeddableFactoryId);
      if (def) {
        factory = this.embeddableFactoryProvider
          ? this.embeddableFactoryProvider(def)
          : defaultEmbeddableFactoryProvider(def);
        this.embeddableFactories.set(def.type, factory);
      } else {
        throw new Error(
          `Embeddable factory [embeddableFactoryId = ${embeddableFactoryId}] does not exist.`
        );
      }
    }

    return factory as EmbeddableFactory<I, O, E>;
  };
}
