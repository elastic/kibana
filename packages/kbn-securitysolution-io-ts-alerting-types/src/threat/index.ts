/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable @typescript-eslint/naming-convention */

import * as t from 'io-ts';
import { threat_tactic } from '../threat_tactic';
import { threat_techniques } from '../threat_technique';

export const threat_framework = t.string;

export const threat = t.intersection([
  t.exact(
    t.type({
      framework: threat_framework,
      tactic: threat_tactic,
    })
  ),
  t.exact(
    t.partial({
      technique: threat_techniques,
    })
  ),
]);

export type Threat = t.TypeOf<typeof threat>;

export const threats = t.array(threat);
export type Threats = t.TypeOf<typeof threats>;

export const threatsOrUndefined = t.union([threats, t.undefined]);
export type ThreatsOrUndefined = t.TypeOf<typeof threatsOrUndefined>;
