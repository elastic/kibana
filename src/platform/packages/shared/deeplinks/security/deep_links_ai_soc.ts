/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export enum SecurityPageNameAiSoc {
  /*
   * Warning: Computed values are not permitted in an enum with string valued members
   * All Cases page names must match `CasesDeepLinkId` in x-pack/platform/plugins/shared/cases/public/common/navigation/deep_links.ts
   */
  case = 'cases', // must match `CasesDeepLinkId.cases`
  caseConfigure = 'cases_configure', // must match `CasesDeepLinkId.casesConfigure`
  caseCreate = 'cases_create', // must match `CasesDeepLinkId.casesCreate`
  attackDiscovery = 'attack_discovery',
  landing = 'get_started',
}
