/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface EventEcs {
  action?: string[];

  category?: string[];

  code?: string[];

  created?: string[];

  dataset?: string[];

  duration?: number[];

  end?: string[];

  hash?: string[];

  id?: string[];

  kind?: string[];

  module?: string[];

  original?: string[];

  outcome?: string[];

  risk_score?: number[];

  risk_score_norm?: number[];

  severity?: number[];

  start?: string[];

  timezone?: string[];

  type?: string[];
}

export enum EventCode {
  // Malware Protection alert
  MALICIOUS_FILE = 'malicious_file',
  // Ransomware Protection alert
  RANSOMWARE = 'ransomware',
  // Memory Protection alert
  MEMORY_SIGNATURE = 'memory_signature',
  // Memory Protection alert
  SHELLCODE_THREAD = 'shellcode_thread',
  // behavior
  BEHAVIOR = 'behavior',
}

export enum EventCategory {
  PROCESS = 'process',
  FILE = 'file',
  NETWORK = 'network',
  REGISTRY = 'registry',
  MALWARE = 'malware',
}
