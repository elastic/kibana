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

import { createKibanaUtilsCore } from './create_kibana_utils_core';
import { CoreStart } from 'kibana/public';

describe('createKibanaUtilsCore', () => {
  it('should allows to work with multiple instances', () => {
    const core1 = {} as CoreStart;
    const core2 = {} as CoreStart;

    const { setCoreStart: setCoreStart1, getCoreStart: getCoreStart1 } = createKibanaUtilsCore();
    const { setCoreStart: setCoreStart2, getCoreStart: getCoreStart2 } = createKibanaUtilsCore();

    setCoreStart1(core1);
    setCoreStart2(core2);

    expect(getCoreStart1()).toBe(core1);
    expect(getCoreStart2()).toBe(core2);

    expect(getCoreStart1() !== getCoreStart2()).toBeTruthy();
  });
});
