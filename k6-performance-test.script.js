/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable @kbn/imports/no_unresolvable_imports */
/* eslint-disable @kbn/eslint/require-license-header */
import encoding from 'k6/encoding';
import http from 'k6/http';
import { sleep } from 'k6';

export const options = {
  vus: 1,
  duration: '20s',
};

const headers = {
  Authorization: `Basic ${encoding.b64encode('elastic:changeme')}`,
};

export function setup() {
  // Wait for 5 seconds before starting
  sleep(5);
}

export default function () {
  // In this K6 test, we hit the rules API endpoint repeatedly
  http.get('http://kibana:5601/api/detection_engine/rules/_find', { headers });
  sleep(1);
}
