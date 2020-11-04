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

import { removeSlashes } from './remove_slashes';

export const appendAppPath = (appBasePath: string, path: string = '') => {
  // Only prepend slash if not a hash or query path
  path = path === '' || path.startsWith('#') || path.startsWith('?') ? path : `/${path}`;
  // Do not remove trailing slash when in hashbang or basePath
  const removeTrailing = path.indexOf('#') === -1 && appBasePath.indexOf('#') === -1;
  return removeSlashes(`${appBasePath}${path}`, {
    trailing: removeTrailing,
    duplicates: true,
    leading: false,
  });
};
