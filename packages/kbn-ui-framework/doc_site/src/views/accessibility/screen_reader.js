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

import React from 'react';

import {
  KuiScreenReaderOnly,
} from '../../../../components';


export default () => (
  <div>
    <p>
      This is the first paragraph. It is visible to all.
    </p>
    <KuiScreenReaderOnly>
      <p>
        This is the second paragraph. It is hidden for sighted users but visible to screen readers.
      </p>
    </KuiScreenReaderOnly>
    <p>
      This is the third paragraph. It is visible to all.
    </p>
  </div>
);

