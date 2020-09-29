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

import { applyPatch } from 'fast-json-patch';
import { IRealTimeRpcClient, RpcPatchInput } from '../../common';
import { RealTimeRpcParams } from './rpc';
import { validatePatchPayload } from './validators';

export class RpcClient implements IRealTimeRpcClient {
  constructor(public readonly params: RealTimeRpcParams) {}

  public readonly ping = async () => 'pong' as 'pong';

  public readonly patch = async (input: RpcPatchInput) => {
    validatePatchPayload(input);

    const { savedObjectsClient } = this.params;
    const { type, id, patch } = input;
    const savedObject = await savedObjectsClient.get(type, id);
    const document = savedObject.attributes;
    const { newDocument } = applyPatch(document, patch);

    await savedObjectsClient.update(type, id, newDocument as any);

    return {
      document: newDocument,
    };
  };
}
