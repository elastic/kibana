/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EcsAutonomousSystem } from './autonomous_system';
import { EcsFile } from './file';
import { EcsGeo } from './geo';
import { EcsRegistry } from './registry';
import { EcsUrl } from './url';
import { EcsX509 } from './x509';

interface IndicatorNestedFields {
  as?: EcsAutonomousSystem;
  file?: EcsFile;
  geo?: EcsGeo;
  registry?: EcsRegistry;
  url?: EcsUrl;
  x509?: EcsX509;
}

/**
 * https://www.elastic.co/guide/en/ecs/master/ecs-threat.html
 *
 * @internal
 */
export interface EcsThreat {
  enrichments?: Enrichment[];
  indicator?: Indicator;
  framework?: string;
  group?: Group;
  software?: Software;
  tactic?: Tactic;
  technique?: Technique;
}

interface Enrichment {
  indicator?: Indicator;
  matched?: Matched;
}

interface Indicator extends IndicatorNestedFields {
  confidence?: string;
  description?: string;
  email?: { address?: string };
  first_seen?: string;
  ip?: string;
  last_seen?: string;
  marking?: { tlp?: string };
  modified_at?: string;
  port?: number;
  provider?: string;
  reference?: string;
  scanner_stats?: number;
  sightings?: number;
  type?: string;
}

interface Matched {
  atomic?: string;
  field?: string;
  id?: string;
  index?: string;
  type?: string;
}

interface Group {
  alias?: string[];
  id?: string;
  name?: string;
  reference?: string;
}

interface Software {
  id?: string;
  name?: string;
  platforms?: string[];
  reference?: string;
  type?: string;
}

interface Tactic {
  id?: string[];
  name?: string[];
  reference?: string[];
}

interface Technique {
  id?: string[];
  name?: string[];
  reference?: string[];
  subtechnique?: Technique;
}
