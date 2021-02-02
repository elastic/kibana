/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

export interface EsConfigApiResponse {
  /**
   * This is the first host in the hosts array that Kibana is configured to use
   * to communicate with ES.
   *
   * At the moment this is used to power the copy as cURL functionality in Console
   * to complete the host portion of the URL.
   */
  host?: string;
}
