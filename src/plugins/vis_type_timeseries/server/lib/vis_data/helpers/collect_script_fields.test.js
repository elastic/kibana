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

import { collectScriptFields } from './collect_scrpt_fields';

describe('collectScriptFields', () => {
  it('should work', () => {
    const script =
      "doc['system.cpu.user.pct'].size() > 0 && doc['system.cpu.system.pct'].size() > 0 && doc['system.cpu.cores'].size() > 0 ? ((doc['system.cpu.user.pct'].value + doc['system.cpu.system.pct'].value) / doc['system.cpu.cores'].value) : 0";
    expect(collectScriptFields(script)).toEqual([
      'system.cpu.user.pct',
      'system.cpu.system.pct',
      'system.cpu.cores',
    ]);
  });
  it('should work with double quotes', () => {
    const script = `doc["gsystem.cpu.user.pct"].size() > 0 && doc["system.cpu.system.pct"].size() > 0 && doc["system.cpu.cores"].size() > 0 ? ((doc["system.cpu.user.pct"].value + doc["system.cpu.system.pct"].value) / doc["system.cpu.cores"].value) : 0`;
    expect(collectScriptFields(script)).toEqual([
      'system.cpu.user.pct',
      'system.cpu.system.pct',
      'system.cpu.cores',
    ]);
  });
  it('should work with an empty script', () => {
    const script = '';
    expect(collectScriptFields(script)).toEqual([]);
  });
});
