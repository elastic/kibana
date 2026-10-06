/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ManagementSection } from './utils';
import type {
  SectionsServiceSetup,
  SectionsServiceStartDeps,
  DefinedSections,
  ManagementSectionsStartPrivate,
} from './types';
declare const getSectionsServiceStartPrivate: import('@kbn/kibana-utils-plugin/common').Get<ManagementSectionsStartPrivate>;
export { getSectionsServiceStartPrivate };
export declare class ManagementSectionsService {
  definedSections: DefinedSections;
  constructor();
  private sections;
  getAllSections: () => ManagementSection[];
  private registerSection;
  setup(): SectionsServiceSetup;
  start({ capabilities }: SectionsServiceStartDeps): {};
}
