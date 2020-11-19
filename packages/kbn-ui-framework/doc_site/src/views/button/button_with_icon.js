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

import { KuiButton, KuiButtonIcon } from '../../../../components';

export default () => (
  <div>
    <KuiButton buttonType="primary" icon={<KuiButtonIcon type="create" />}>
      Create
    </KuiButton>

    <br />
    <br />

    <KuiButton buttonType="danger" icon={<KuiButtonIcon type="delete" />}>
      Delete
    </KuiButton>

    <br />
    <br />

    <KuiButton buttonType="basic" icon={<KuiButtonIcon type="previous" />}>
      Previous
    </KuiButton>

    <br />
    <br />

    <KuiButton buttonType="basic" icon={<KuiButtonIcon type="next" />} iconPosition="right">
      Next
    </KuiButton>

    <br />
    <br />

    <KuiButton buttonType="basic" icon={<KuiButtonIcon type="loading" />}>
      Loading
    </KuiButton>

    <br />
    <br />

    <KuiButton
      buttonType="basic"
      aria-label="Book flight"
      icon={<KuiButtonIcon className="fa-plane" />}
    />
  </div>
);
