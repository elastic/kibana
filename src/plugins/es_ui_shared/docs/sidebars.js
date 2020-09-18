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

module.exports = {
  general: [
    {
      type: 'category',
      label: 'Getting started',
      items: ['introduction'],
    },
  ],
  formLib: [
    {
      type: 'category',
      label: 'Getting Started',
      items: ['form_lib/getting_started/about'],
    },
    {
      type: 'category',
      label: 'Examples',
      items: ['form_lib/examples/validation', 'form_lib/examples/react_to_changes'],
    },
    {
      type: 'category',
      label: 'Core',
      items: [
        'form_lib/core/about',
        'form_lib/core/in_out_raw_state',
        'form_lib/core/default_value',
        'form_lib/core/use_form_hook',
        'form_lib/core/form_hook',
        'form_lib/core/use_field',
        'form_lib/core/typescript',
      ],
    },
  ],
};
