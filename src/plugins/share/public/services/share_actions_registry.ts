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

import { ShareActionProps, ShareActionsProvider } from '../types';

export class ShareActionsRegistry {
  private readonly shareActionsProviders = new Map<string, ShareActionsProvider>();

  public setup() {
    return {
      register: (shareActionsProvider: ShareActionsProvider) => {
        if (this.shareActionsProviders.has(shareActionsProvider.id)) {
          throw new Error(
            `Share action provider with id [${shareActionsProvider.id}] has already been registered. Use a unique id.`
          );
        }

        this.shareActionsProviders.set(shareActionsProvider.id, shareActionsProvider);
      },
    };
  }

  public start() {
    return {
      getActions: (props: ShareActionProps) =>
        Array.from(this.shareActionsProviders.values())
          .flatMap(shareActionProvider => shareActionProvider.getShareActions(props))
    };
  }
}

export type ShareActionsRegistrySetup = ReturnType<ShareActionsRegistry['setup']>;
export type ShareActionsRegistryStart = ReturnType<ShareActionsRegistry['start']>;
