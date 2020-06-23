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
 * Have to import "/pure" here to not register afterEach() hook clean up
 * in the very beginning. There are couple tests which fail with clean up hook.
 * On CI they run before first test which imports '@testing-library/react'
 * and registers afterEach hook so the whole suite is passing.
 * This have to be fixed as we depend on test order execution
 * https://github.com/elastic/kibana/issues/59469
 */
import { configure } from '@testing-library/react/pure';

// instead of default 'data-testid', use kibana's 'data-test-subj'
configure({ testIdAttribute: 'data-test-subj' });
