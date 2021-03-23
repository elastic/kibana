/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { AWS } from './aws';
import { AZURE } from './azure';
import { GCP } from './gcp';

/**
 * An iteratable that can be used to loop across all known cloud services to detect them.
 */
export const CLOUD_SERVICES: [typeof AWS, typeof GCP, typeof AZURE] = [AWS, GCP, AZURE];
