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

import { Plugin, CoreSetup, AppMountParameters } from 'kibana/public';
import * as React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { BfetchPublicStart } from '../../../src/plugins/bfetch/public';
import { BfetchExplorerApp } from './app';

export interface BfetchExplorerStartPlugins {
  bfetch: BfetchPublicStart;
}

export class BfetchExplorerPlugin implements Plugin {
  public setup(coreSetup: CoreSetup<BfetchExplorerStartPlugins>) {
    coreSetup.application.register({
      id: 'bfetchExplorer',
      title: 'bfetch explorer',
      async mount({ element }: AppMountParameters) {
        const deps = await coreSetup.getStartServices();
        render(<BfetchExplorerApp core={deps[0]} plugins={deps[1]} />, element);
        return () => unmountComponentAtNode(element);
      },
    });
  }

  public start() {}
  public stop() {}
}
