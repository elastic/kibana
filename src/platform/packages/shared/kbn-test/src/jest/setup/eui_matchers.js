/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-env jest */

import { setupEuiMatchers } from '@elastic/eui/lib/test/rtl/matchers';
import { setupEuiEnzymeMatchers } from '@elastic/eui/lib/test/enzyme/enzyme_matchers';

setupEuiMatchers();
// TODO: Remove once Enzyme is fully migrated to RTL
setupEuiEnzymeMatchers();
