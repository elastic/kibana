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
import { EmbeddableFactoryRegistry } from './types';
import { bootstrap } from './bootstrap';
import { EmbeddableFactory, EmbeddableInput, EmbeddableOutput, IEmbeddable } from './lib';

export interface EmbeddableSetupDependencies {
  uiActions: UiActionsSetup;
}

export interface EmbeddableSetup {
  registerEmbeddableFactory: <I extends EmbeddableInput, O extends EmbeddableOutput>(
    id: string,
    factory: EmbeddableFactory<I, O>
  ) => void;
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
  private readonly embeddableFactories: EmbeddableFactoryRegistry = new Map();

  constructor(initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup, { uiActions }: EmbeddableSetupDependencies) {
    bootstrap(uiActions, this.getEmbeddableFactory);

    return {
      registerEmbeddableFactory: this.registerEmbeddableFactory,
    };
  }

  public start(core: CoreStart) {
    return {
      getEmbeddableFactory: this.getEmbeddableFactory,
      getEmbeddableFactories: () => this.embeddableFactories.values(),
    };
  }

  public stop() {}

  private registerEmbeddableFactory = (embeddableFactoryId: string, factory: EmbeddableFactory) => {
    if (this.embeddableFactories.has(embeddableFactoryId)) {
      throw new Error(
        `Embeddable factory [embeddableFactoryId = ${embeddableFactoryId}] already registered in Embeddables API.`
      );
    }

    this.embeddableFactories.set(embeddableFactoryId, factory);
  };

  private getEmbeddableFactory = <
    I extends EmbeddableInput = EmbeddableInput,
    O extends EmbeddableOutput = EmbeddableOutput,
    E extends IEmbeddable<I, O> = IEmbeddable<I, O>
  >(
    embeddableFactoryId: string
  ) => {
    const factory = this.embeddableFactories.get(embeddableFactoryId);

    if (!factory) {
      throw new Error(
        `Embeddable factory [embeddableFactoryId = ${embeddableFactoryId}] does not exist.`
      );
    }

    return factory as EmbeddableFactory<I, O, E>;
  };
}
