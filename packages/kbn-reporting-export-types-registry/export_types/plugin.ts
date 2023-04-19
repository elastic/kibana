/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import type { ExportType, ExportTypesRegistry } from '../export_types_registry';
import { CSVExportType, ExportTypeEntry } from '../export_definitions';

export interface ExportTypesPluginSetup {
  /** added to the reporting plugin and registers in the public reporting setup() */
  getTypes: (core: any, type: any) => ExportTypesPlugin['setup'];
  // public reporting plugin also creates the et registry
  registry: () => ExportTypesRegistry;
}

export interface ExportTypesPluginStart {
  /** Plugin lifecycle functions can only access the APIs that are exposed during that lifecycle */
}

export class ExportTypesPlugin implements Plugin<ExportTypesPluginSetup, ExportTypesPluginStart> {
  private exportType?: ExportType;
  // getContract from ReportingPublicPlugin x-pack/plugins/reporting/public/plugin.ts

  public setup(core: CoreSetup<ExportTypesPluginSetup>, plugins: object) {
    return {
      register: (type: ExportTypeEntry) => {
        // does the entry need to be independent or is it just one of the three types
        // is this where we could see if it's serverless and needs to be disabled etc or is that probably in the reporting plugin itself
        if (this.exportType.has(id)) {
          throw new Error(``);
        }
        return {} as CSVExportType;
      },
    };
  }
  public start(core: CoreStart) {
    // return this.getContract()
    return this.exportTypeStart;
  }

  public disablePngType(et: ExportTypeEntry) {}

  public disablePdfType(et: ExportTypeEntry) {}
}
