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

/**
 * Import this test utility in your jest test (and only there!) if you want the
 * htmlIdGenerator from EUI to generate static ids. That will be needed if you
 * want to use snapshot tests for a component, that uses the htmlIdGenerator.
 * By default every test run would result in different ids and thus not be comparable.
 * You can solve this by just importing this file. It will mock the htmlIdGenerator
 * for the test file that imported it to produce static, but therefore potentially
 * duplicate ids.
 *
 * import 'test_utils/html_id_generator';
 */

/* global jest */
jest.mock('@elastic/eui/lib/services/accessibility/html_id_generator', () => ({
  htmlIdGenerator: (prefix = 'staticGenerator') => {
    return (suffix = 'staticId') => `${prefix}_${suffix}`;
  },
}));
