/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { PeerCertificate } from 'tls';

import type { ElasticsearchConnectionStatus } from './elasticsearch_connection_status';

/**
 * The token that allows one to configure Kibana instance to communicate with an existing Elasticsearch cluster that
 * has security features enabled.
 */
export interface EnrollmentToken {
  /**
   * The version of the Elasticsearch node that generated this enrollment token.
   */
  ver: string;

  /**
   * An array of addresses in the form of `<hostname>:<port>` or `<ip_address>:<port>` where the Elasticsearch node is listening for HTTP connections.
   */
  adr: readonly string[];

  /**
   * The SHA-256 fingerprint of the CA certificate that is used to sign the certificate that the Elasticsearch node presents for HTTP over TLS connections.
   */
  fgr: string;

  /**
   * An Elasticsearch API key (not encoded) that can be used as credentials authorized to call the enrollment related APIs in Elasticsearch.
   */
  key: string;
}

export interface Certificate {
  issuer: Partial<PeerCertificate['issuer']>;
  valid_from: PeerCertificate['valid_from'];
  valid_to: PeerCertificate['valid_to'];
  subject: Partial<PeerCertificate['subject']>;
  fingerprint256: PeerCertificate['fingerprint256'];
  raw: string;
}

export interface PingResult {
  /**
   * Indicates whether the cluster requires authentication.
   */
  authRequired: boolean;

  /**
   * Full certificate chain of cluster at requested address. Only present if cluster uses HTTPS.
   */
  certificateChain?: Certificate[];
}

export interface StatusResult {
  /**
   * Full certificate chain of cluster at requested address. Only present if cluster uses HTTPS.
   */
  connectionStatus: ElasticsearchConnectionStatus;

  /**
   * Indicates whether Kibana is currently on hold and cannot proceed to `setup` yet.
   */
  isSetupOnHold: boolean;
}
