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

import { defaultAlertText } from './default_alert';

describe('defaultAlertText', () => {
  it('creates a valid MountPoint that can cleanup correctly', () => {
    const mountPoint = defaultAlertText(jest.fn());

    const el = document.createElement('div');
    const unmount = mountPoint(el);

    expect(el.querySelectorAll('[data-test-subj="insecureClusterDefaultAlertText"]')).toHaveLength(
      1
    );

    unmount();

    expect(el).toMatchInlineSnapshot(`<div />`);
  });
});
