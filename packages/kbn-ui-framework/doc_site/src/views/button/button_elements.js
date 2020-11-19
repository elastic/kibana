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

import { KuiButton, KuiLinkButton, KuiSubmitButton } from '../../../../components';

export default () => (
  <div>
    <KuiButton buttonType="basic">Button element</KuiButton>

    <br />
    <br />

    <form
      onSubmit={(e) => {
        e.preventDefault();
        window.alert('Submit');
      }}
    >
      <KuiSubmitButton buttonType="basic">Submit input element</KuiSubmitButton>
    </form>

    <br />

    <form
      onSubmit={(e) => {
        e.preventDefault();
        window.alert('Submit');
      }}
    >
      <KuiSubmitButton buttonType="basic" disabled>
        Submit input element, disabled
      </KuiSubmitButton>
    </form>

    <br />

    <KuiLinkButton buttonType="basic" href="http://www.google.com" target="_blank">
      Anchor element
    </KuiLinkButton>

    <br />
    <br />

    <KuiLinkButton buttonType="basic" href="http://www.google.com" target="_blank" disabled>
      Anchor element, disabled
    </KuiLinkButton>
  </div>
);
