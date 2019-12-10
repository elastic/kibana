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

import { CoreSetup, CoreStart, Plugin } from 'kibana/public';
import { DataPublicPluginStart } from 'src/plugins/data/public';
import { TopNavMenuExtensionsRegistry, TopNavMenuExtensionsRegistrySetup } from './top_nav_menu';
import { createTopNav } from './top_nav_menu/create_top_nav_menu';
import { TopNavMenuProps } from './top_nav_menu/top_nav_menu';

/**
 * Interface for this plugin's returned `setup` contract.
 *
 * @public
 */
export interface NavigationSetup {
  registerMenuItem: TopNavMenuExtensionsRegistrySetup['register'];
}

/**
 * Interface for this plugin's returned `start` contract.
 *
 * @public
 */
export interface NavigationStart {
  ui: {
    TopNavMenu: React.ComponentType<TopNavMenuProps>;
  };
}

export interface NavigationPluginStartDependencies {
  data: DataPublicPluginStart;
}

export class NavigationPlugin implements Plugin<NavigationSetup, NavigationStart> {
  private readonly topNavMenuExtensionsRegistry: TopNavMenuExtensionsRegistry = new TopNavMenuExtensionsRegistry();

  public setup(core: CoreSetup): NavigationSetup {
    return {
      registerMenuItem: this.topNavMenuExtensionsRegistry.register.bind(
        this.topNavMenuExtensionsRegistry
      ),
    };
  }

  public start(core: CoreStart, { data }: NavigationPluginStartDependencies): NavigationStart {
    const extensions = this.topNavMenuExtensionsRegistry.getAll();

    return {
      ui: {
        TopNavMenu: createTopNav(data, extensions),
      },
    };
  }

  public stop() {
    this.topNavMenuExtensionsRegistry.clear();
  }
}
