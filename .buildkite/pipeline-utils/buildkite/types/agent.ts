/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface Agent {
  id: string;
  url: string;
  web_url: string;
  name: string;
  connection_state: string;
  ip_address: string;
  hostname: string;
  user_agent: string;
  version: string;
  creator?: string | null;
  created_at: string;
  last_job_finished_at?: string | null;
  priority: number;
  meta_data?: null | [string];
}
