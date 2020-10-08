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

import '@testing-library/jest-dom';
/**
 * PLEASE NOTE:
 * Importing '@testing-library/react' registers an `afterEach(cleanup)` side effect.
 * It has tricky code that flushes pending promises, that previously led to unpredictable test failures
 * https://github.com/elastic/kibana/issues/59469
 * But since newer versions it has stabilised itself
 */
import { configure } from '@testing-library/react';

// instead of default 'data-testid', use kibana's 'data-test-subj'
configure({ testIdAttribute: 'data-test-subj', asyncUtilTimeout: 4500 });
