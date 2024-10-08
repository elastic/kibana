/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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
