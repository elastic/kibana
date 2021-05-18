/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/* eslint-disable @typescript-eslint/naming-convention */

import * as t from 'io-ts';

export const threat_subtechnique_id = t.string;
export const threat_subtechnique_name = t.string;
export const threat_subtechnique_reference = t.string;

export const threat_subtechnique = t.type({
  id: threat_subtechnique_id,
  name: threat_subtechnique_name,
  reference: threat_subtechnique_reference,
});

export const threat_subtechniques = t.array(threat_subtechnique);

export type ThreatSubtechnique = t.TypeOf<typeof threat_subtechnique>;
