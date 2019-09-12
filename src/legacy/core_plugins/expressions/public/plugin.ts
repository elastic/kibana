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

import { CoreSetup, CoreStart, Plugin } from '../../../../core/public';
import { ExpressionsService, ExpressionsSetup, ExpressionsStart } from './expressions';
import {
  Start as InspectorStart,
  Setup as InspectorSetup,
} from '../../../../plugins/inspector/public';

/**
 * Interface for any dependencies on other plugins' `setup` contracts.
 *
 * @internal
 */
export interface ExpressionsPluginSetupDependencies {
  inspector: InspectorSetup;
}

export interface ExpressionsPluginStartDependencies {
  inspector: InspectorStart;
}

/**
 * Interface for this plugin's returned `setup` contract.
 *
 * @public
 */

export class ExpressionsPlugin
  implements
    Plugin<
      ExpressionsSetup,
      ExpressionsStart,
      ExpressionsPluginSetupDependencies,
      ExpressionsPluginStartDependencies
    > {
  // Exposed services, sorted alphabetically
  private readonly expressions: ExpressionsService = new ExpressionsService();

  public setup(core: CoreSetup): ExpressionsSetup {
    return {
      ...this.expressions.setup(),
    };
  }

  public start(core: CoreStart, plugins: ExpressionsPluginStartDependencies): ExpressionsStart {
    return {
      ...this.expressions.start({ inspector: plugins.inspector }),
    };
  }

  public stop() {
    this.expressions.stop();
  }
}
