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
import { XJsonMode } from '../../../public';
import { useXJsonMode as useBaseXJsonMode } from '../../../__packages_do_not_import__/xjson';

const xJsonMode = new XJsonMode();

interface ReturnValue extends ReturnType<typeof useBaseXJsonMode> {
  xJsonMode: typeof xJsonMode;
}

export const useXJsonMode = (json: Parameters<typeof useBaseXJsonMode>[0]): ReturnValue => {
  return {
    ...useBaseXJsonMode(json),
    xJsonMode,
  };
};
