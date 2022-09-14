/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { MaybePromise } from '@kbn/utility-types';
import type { DeprecationsDetails } from '@kbn/core-deprecations-common';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';

/**
 * The deprecations service provides a way for the Kibana platform to communicate deprecated
 * features and configs with its users. These deprecations are only communicated
 * if the deployment is using these features. Allowing for a user tailored experience
 * for upgrading the stack version.
 *
 * The Deprecation service is consumed by the upgrade assistant to assist with the upgrade
 * experience.
 *
 * If a deprecated feature can be resolved without manual user intervention.
 * Using correctiveActions.api allows the Upgrade Assistant to use this api to correct the
 * deprecation upon a user trigger.
 *
 * @example
 * ```ts
 * import { DeprecationsDetails, GetDeprecationsContext, CoreSetup } from 'src/core/server';
 * import { i18n } from '@kbn/i18n';
 *
 * async function getDeprecations({ esClient, savedObjectsClient }: GetDeprecationsContext): Promise<DeprecationsDetails[]> {
 *   const deprecations: DeprecationsDetails[] = [];
 *   const count = await getFooCount(savedObjectsClient);
 *   if (count > 0) {
 *     deprecations.push({
 *       title: i18n.translate('xpack.foo.deprecations.title', {
 *         defaultMessage: `Foo's are deprecated`
 *       }),
 *       message: i18n.translate('xpack.foo.deprecations.message', {
 *         defaultMessage: `You have {count} Foo's. Migrate your Foo's to a dashboard to continue using them.`,
 *         values: { count },
 *       }),
 *       documentationUrl:
 *         'https://www.elastic.co/guide/en/kibana/current/foo.html',
 *       level: 'warning',
 *       correctiveActions: {
 *         manualSteps: [
 *            i18n.translate('xpack.foo.deprecations.manualStepOneMessage', {
 *              defaultMessage: 'Navigate to the Kibana Dashboard and click "Create dashboard".',
 *            }),
 *            i18n.translate('xpack.foo.deprecations.manualStepTwoMessage', {
 *              defaultMessage: 'Select Foo from the "New Visualization" window.',
 *            }),
 *         ],
 *         api: {
 *           path: '/internal/security/users/test_dashboard_user',
 *           method: 'POST',
 *           body: {
 *             username: 'test_dashboard_user',
 *             roles: [
 *               "machine_learning_user",
 *               "enrich_user",
 *               "kibana_admin"
 *             ],
 *             full_name: "Alison Goryachev",
 *             email: "alisongoryachev@gmail.com",
 *             metadata: {},
 *             enabled: true
 *           }
 *         },
 *       },
 *     });
 *   }
 *   return deprecations;
 * }
 *
 *
 * export class Plugin() {
 *   setup: (core: CoreSetup) => {
 *     core.deprecations.registerDeprecations({ getDeprecations });
 *   }
 * }
 * ```
 *
 * @public
 */
export interface DeprecationsServiceSetup {
  registerDeprecations: (deprecationContext: RegisterDeprecationsConfig) => void;
}

/**
 * @public
 */
export interface RegisterDeprecationsConfig {
  getDeprecations: (context: GetDeprecationsContext) => MaybePromise<DeprecationsDetails[]>;
}

/**
 * @public
 */
export interface GetDeprecationsContext {
  esClient: IScopedClusterClient;
  savedObjectsClient: SavedObjectsClientContract;
}

/**
 * @public
 */
export interface DeprecationRegistryProvider {
  getRegistry: (domainId: string) => DeprecationsServiceSetup;
}
