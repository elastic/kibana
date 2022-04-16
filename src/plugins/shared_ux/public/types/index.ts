/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/* eslint-disable @typescript-eslint/no-empty-interface */

import { SharedUxServices } from '@kbn/shared-ux-services';
import { DataViewEditorStart } from '@kbn/data-view-editor-plugin/public';

/** @internal */
export interface SharedUXPluginSetup {}

/**
 * The Shared UX plugin public contract, containing prewired components, services, and
 * other constructs useful to consumers.
 */
export interface SharedUXPluginStart {
  /**
   * A set of pre-wired services for use with `SharedUxServicesProvider`.
   *
   * ```
   * import { SharedUxServicesProvider } from '@kbn/shared-ux-services';
   *
   * public start(coreStart: CoreStart, startPlugins: MyPluginStartDeps): MyPluginStart {
   *   const services = startPlugins.sharedUX.getContextServices();
   *   return {
   *     ServicesContext: ({ children }) => <SharedUxServicesProvider {...services}>{children}</SharedUxServicesProvider>,
   *   };
   * }
   * ```
   *
   * or
   *
   * ```
   * import { SharedUxServicesProvider } from '@kbn/shared-ux-services';
   *
   * public setup(coreSetup: CoreSetup, setupPlugins: MyPluginSetupDeps): MyPluginSetup {
   *   const [coreStart, startPlugins] = await coreSetup.getStartServices();
   *   coreSetup.application.register({
   *     mount: async (params: AppMountParameters) => {
   *       ReactDOM.render(
   *         <SharedUxServicesProvider {...startPlugins.sharedUX.getContextServices()}>
   *           <MyApp />
   *         </SharedUxServicesProvider>,
   *         params.element
   *       );
   *     }
   *   );
   * }
   * ```
   */
  getContextServices: () => SharedUxServices;
}

/** @internal */
export interface SharedUXPluginSetupDeps {}

/** @internal */
export interface SharedUXPluginStartDeps {
  dataViewEditor: DataViewEditorStart;
}
