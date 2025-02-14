/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { commonFunctionalServices } from '@kbn/ftr-common-functional-services';
import { commonFunctionalUIServices } from '@kbn/ftr-common-functional-ui-services';

// pick only services that work for any FTR config, e.g. 'samlAuth' requires SAML setup in config file
const {
  es,
  esArchiver,
  kibanaServer,
  retry,
  deployment,
  randomness,
  esDeleteAllIndices,
  savedObjectInfo,
  indexPatterns,
  search,
  console,
  supertest,
  esSupertest,
  supertestWithoutAuth,
} = commonFunctionalServices;

// pick what was there previously
const { security } = commonFunctionalUIServices;

export const services = {
  es,
  esArchiver,
  kibanaServer,
  retry,
  deployment,
  randomness,
  security,
  esDeleteAllIndices,
  savedObjectInfo,
  indexPatterns,
  search,
  console,
  supertest,
  esSupertest,
  supertestWithoutAuth,
};
