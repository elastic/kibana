/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CoreStart } from '@kbn/core/public';

export interface DashboardDocumentationLinksService {
  indexPatternsDocLink: CoreStart['docLinks']['links']['indexPatterns']['introduction'];
  kibanaGuideDocLink: CoreStart['docLinks']['links']['kibana']['guide'];
  dashboardDocLink: CoreStart['docLinks']['links']['dashboard']['guide'];
  esqlDocLink: CoreStart['docLinks']['links']['query']['queryESQL'];
}
