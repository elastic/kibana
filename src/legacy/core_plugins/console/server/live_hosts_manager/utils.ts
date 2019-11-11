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

import fetch from 'node-fetch';

const probe = async (host: string): Promise<{ ok: boolean }> => {
  try {
    await fetch(`${host}/`, { method: 'HEAD' });
    return { ok: true };
  } catch (e) {
    return { ok: false };
  }
};

const roundRobinNextIdx = (number: number, max: number) => {
  if (number >= max) {
    return 0;
  }
  return number + 1;
};

export const findLiveHostIdx = async (startIdx: number, hosts: string[]) => {
  if ((await probe(hosts[startIdx])).ok) {
    return startIdx;
  }

  const recurse = async (idx: number): Promise<number> => {
    if (idx === startIdx) {
      throw new Error('No live host found!');
    }
    const host = hosts[idx];
    const result = await probe(host);
    if (result.ok) {
      return idx;
    }
    const nextId = roundRobinNextIdx(idx, hosts.length);
    return recurse(nextId);
  };

  return await recurse(roundRobinNextIdx(startIdx, hosts.length));
};
