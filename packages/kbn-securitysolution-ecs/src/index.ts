/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Ecs } from '@kbn/ecs';
import type { AuditdEcs } from './auditd';
import type { DestinationEcs } from './destination';
import type { DnsEcs } from './dns';
import type { DllEcs } from './dll';
import type { EndgameEcs } from './endgame';
import type { EventEcs } from './event';
import type { FileEcs } from './file';
import type { GeoEcs } from './geo';
import type { HostEcs } from './host';
import type { NetworkEcs } from './network';
import type { RegistryEcs } from './registry';
import type { RuleEcs } from './rule';
import type { SignalEcs, SignalEcsAAD } from './signal';
import type { SourceEcs } from './source';
import type { SuricataEcs } from './suricata';
import type { TlsEcs } from './tls';
import type { ZeekEcs } from './zeek';
import type { HttpEcs } from './http';
import type { UrlEcs } from './url';
import type { UserEcs } from './user';
import type { WinlogEcs } from './winlog';
import type { ProcessEcs } from './process';
import type { SystemEcs } from './system';
import type { ThreatEcs } from './threat';
import type { Ransomware } from './ransomware';
import type { MemoryProtection } from './memory_protection';
import type { Target } from './target_type';

type OverwriteTypes =
  | 'destination'
  | 'dns'
  | 'event'
  | 'file'
  | 'host'
  | 'http'
  | 'message'
  | 'network'
  | 'process'
  | 'registry'
  | 'rule'
  | 'source'
  | 'threat'
  | 'tls'
  | 'url'
  | 'user';

// Security Common Schema
export interface Scs extends Omit<Ecs, OverwriteTypes> {
  // Exists in Ecs
  // overwrites to support multiple values for security entities
  destination?: DestinationEcs;
  dns?: DnsEcs;
  event?: EventEcs;
  file?: FileEcs;
  host?: HostEcs;
  http?: HttpEcs;
  message?: string[];
  network?: NetworkEcs;
  process?: ProcessEcs;
  registry?: RegistryEcs;
  rule?: RuleEcs;
  source?: SourceEcs;
  threat?: ThreatEcs;
  tls?: TlsEcs;
  url?: UrlEcs;
  user?: UserEcs;

  // security specific Ecs
  // exists only in security solution
  _id: string;
  _index?: string;
  auditd?: AuditdEcs;
  endgame?: EndgameEcs;
  geo?: GeoEcs;
  kibana?: {
    alert: SignalEcsAAD;
  };
  // I believe these parameters are all snake cased to correspond with how they are sent "over the wire" as request / response
  // Not representative of the parsed types that are camel cased.
  'kibana.alert.rule.parameters'?: { index: string[]; data_view_id?: string };
  'kibana.alert.workflow_status'?: 'open' | 'acknowledged' | 'in-progress' | 'closed';
  // eslint-disable-next-line @typescript-eslint/naming-convention
  Memory_protection?: MemoryProtection;
  Ransomware?: Ransomware;
  Target?: Target;
  dll?: DllEcs;
  // This should be temporary
  eql?: { parentId: string; sequenceNumber: string };
  signal?: SignalEcs;
  suricata?: SuricataEcs;
  system?: SystemEcs;
  timestamp?: string;
  winlog?: WinlogEcs;
  zeek?: ZeekEcs;
}
