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
import { Method } from '../rpc';

type JsonPatch = unknown;

export interface PatchPayload {
  type: string;
  id: string;
  patch: JsonPatch;
}

const validatePatchPayload = (x: unknown): x is PatchPayload => {
  if (typeof x !== 'object') throw new Error('Payload must be object');
  if (typeof (x as PatchPayload).type !== 'string') throw new Error('Type must be string');
  if (typeof (x as PatchPayload).id !== 'string') throw new Error('ID must be string');
  if (!Array.isArray((x as PatchPayload).patch)) throw new Error('Patch must be an array.');
  return true;
};

export const patch: Method = async ({ savedObjectsClient }, payload) => {
  if (!validatePatchPayload(payload)) throw new Error('Invalid payload.');

  const { type, id } = payload;

  const savedObject = await savedObjectsClient.get(type, id);
  const document = savedObject.attributes;

  const { newDocument } = applyPatch(document, payload.patch as any);

  await savedObjectsClient.update(type, id, newDocument as any);

  return {
    document: newDocument,
  };
};
