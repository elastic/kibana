/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Manual, exhaustive list at present.  This was attempted dynamically using Typescript Template Literals and
// the computation cost exceeded the benefit.  By enumerating them manually, we reduce the complexity of TS
// checking at the expense of not being dynamic against a very, very static list.
//
// The only consequence is requiring a solution name without a space, (e.g. `ElasticStack`) until it's added
// here.  That's easy to do in the very unlikely event that ever happens.
export type SolutionNameType =
  | 'App Search'
  | 'Beats'
  | 'Business Analytics'
  | 'Cloud'
  | 'Cloud Enterprise'
  | 'Code'
  | 'Elastic'
  | 'Elastic Stack'
  | 'Elasticsearch'
  | 'Enterprise Search'
  | 'Logstash'
  | 'Maps'
  | 'Metrics'
  | 'Observability'
  | 'Security'
  | 'Site Search'
  | 'Uptime'
  | 'Webhook'
  | 'Workplace Search';
