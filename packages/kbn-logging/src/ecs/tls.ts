/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EcsX509 } from './x509';

interface NestedClientFields {
  x509?: EcsX509;
}

interface NestedServerFields {
  x509?: EcsX509;
}

/**
 * https://www.elastic.co/guide/en/ecs/master/ecs-tls.html
 *
 * @internal
 */
export interface EcsTls {
  cipher?: string;
  client?: Client;
  curve?: string;
  established?: boolean;
  next_protocol?: string;
  resumed?: boolean;
  server?: Server;
  version?: string;
  version_protocol?: string;
}

interface Client extends NestedClientFields {
  certificate?: string;
  certificate_chain?: string[];
  hash?: Hash;
  issuer?: string;
  ja3?: string;
  not_after?: string;
  not_before?: string;
  server_name?: string;
  subject?: string;
  supported_ciphers?: string[];
}

interface Server extends NestedServerFields {
  certificate?: string;
  certificate_chain?: string[];
  hash?: Hash;
  issuer?: string;
  ja3s?: string;
  not_after?: string;
  not_before?: string;
  subject?: string;
}

interface Hash {
  md5?: string;
  sha1?: string;
  sha256?: string;
}
