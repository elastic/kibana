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
  feed?: Feed;
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
  confidence?: 'Not Specified' | 'None' | 'Low' | 'Medium' | 'High';
  description?: string;
  email?: { address?: string };
  first_seen?: string;
  ip?: string;
  last_seen?: string;
  marking?: Marking;
  modified_at?: string;
  port?: number;
  provider?: string;
  reference?: string;
  scanner_stats?: number;
  sightings?: number;
  type?: IndicatorType;
}

interface Feed {
  dashboard_id?: string;
  description?: string;
  name?: string;
  reference?: string;
}

interface Marking {
  tlp?: 'WHITE' | 'GREEN' | 'AMBER' | 'RED';
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
  platforms?: SoftwarePlatforms[];
  reference?: string;
  type?: 'Malware' | 'Tool';
}

type SoftwarePlatforms =
  | 'AWS'
  | 'Azure'
  | 'Azure AD'
  | 'GCP'
  | 'Linux'
  | 'macOS'
  | 'Network'
  | 'Office 365'
  | 'SaaS'
  | 'Windows';

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

type IndicatorType =
  | 'autonomous-system'
  | 'artifact'
  | 'directory'
  | 'domain-name'
  | 'email-addr'
  | 'file'
  | 'ipv4-addr'
  | 'ipv6-addr'
  | 'mac-addr'
  | 'mutex'
  | 'port'
  | 'process'
  | 'software'
  | 'url'
  | 'user-account'
  | 'windows-registry-key'
  | 'x509-certificate';
