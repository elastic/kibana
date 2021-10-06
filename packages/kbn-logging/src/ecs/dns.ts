/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * https://www.elastic.co/guide/en/ecs/master/ecs-dns.html
 *
 * @internal
 */
export interface EcsDns {
  answers?: Answer[];
  header_flags?: string[];
  id?: number;
  op_code?: string;
  question?: Question;
  resolved_ip?: string[];
  response_code?: string;
  type?: string;
}

interface Answer {
  data: string;
  class?: string;
  name?: string;
  ttl?: number;
  type?: string;
}

interface Question {
  class?: string;
  name?: string;
  registered_domain?: string;
  subdomain?: string;
  top_level_domain?: string;
  type?: string;
}
