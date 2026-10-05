/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutServerConfig } from '../../../../../types';
import { defaultConfig } from '../../default/stateful/base.config';

// The managed MITRE UI suite seeds a synthetic MITRE framework version into the Saved Objects
// index and removes it on teardown. Server-side consumers cache the managed MITRE dataset for
// the process lifetime, so the suite needs a Kibana of its own rather than the shared default
// server, otherwise the seeded entities leak into other suites (and theirs into this one).
// The config itself is identical to the default set.
export const servers: ScoutServerConfig = { ...defaultConfig };
