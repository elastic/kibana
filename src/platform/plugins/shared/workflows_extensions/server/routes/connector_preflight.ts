/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IRouter, KibanaRequest, Logger } from '@kbn/core/server';
import { z } from '@kbn/zod/v4';
import { getConnectorSpec, TEST_CONNECTOR_SUB_ACTION } from '@kbn/connector-specs';
import { WorkflowsManagementOperationPrivileges } from '@kbn/workflows';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { ActionTypeExecutorResult } from '@kbn/actions-plugin/common';

export const CONNECTOR_PREFLIGHT_ROUTE_PATH = '/internal/workflows_extensions/connector_preflight';

const bodySchema = z.object({
  /** Connector instance id to health-check. */
  connectorId: z.string(),
  /** Action names to verify. When omitted, every action in the spec is checked. */
  actions: z.array(z.string()).optional(),
});

/**
 * Preflight gates workflow enablement, so it requires the workflows read privilege;
 * per-connector read/execute authorization is additionally enforced by the secured
 * actions client (getActionsClientWithRequest).
 */
const PREFLIGHT_SECURITY = {
  authz: { requiredPrivileges: [...WorkflowsManagementOperationPrivileges.read] },
};

export type PreflightActionsClient = Pick<ActionsClient, 'get' | 'execute'>;
export type GetPreflightActionsClient = (request: KibanaRequest) => Promise<PreflightActionsClient>;

export interface ConnectorPreflightActionResult {
  action: string;
  ok: boolean;
  error?: string;
  isTool?: boolean;
  scope?: string;
}

/**
 * Registers the connector preflight health API.
 *
 * Given a connector id and (optionally) a set of action names, verifies that the
 * connector authenticates and that each action exists, so install/policy-save can
 * surface actionable per-action errors BEFORE a workflow that depends on the
 * connector is enabled.
 *
 * The auth check is real: it executes the connector's own `test` handler through
 * the genuine actions executor (which builds the authenticated ActionContext from
 * the connector's decrypted secrets). When a connector spec has no test handler,
 * auth cannot be verified and `authenticated` is reported as `null` rather than a
 * vacuous pass.
 */
export function registerConnectorPreflightRoute(
  router: IRouter,
  getActionsClient: GetPreflightActionsClient,
  logger: Logger
): void {
  router.post(
    {
      path: CONNECTOR_PREFLIGHT_ROUTE_PATH,
      options: { access: 'internal' },
      security: PREFLIGHT_SECURITY,
      validate: { body: bodySchema },
    },
    async (_context, request, response) => {
      const { connectorId, actions: requestedActions } = request.body;
      const actionsClient = await getActionsClient(request);

      let connector;
      try {
        connector = await actionsClient.get({ id: connectorId });
      } catch (err) {
        return response.notFound({
          body: {
            message: `Connector "${connectorId}" not found: ${
              err instanceof Error ? err.message : String(err)
            }`,
          },
        });
      }

      const spec = getConnectorSpec(connector.actionTypeId);
      if (!spec) {
        return response.badRequest({
          body: {
            message: `Connector "${connectorId}" uses type "${connector.actionTypeId}", which has no registered connector spec.`,
          },
        });
      }

      // Real auth/scope check via the connector's test handler, executed through the
      // genuine executor so the authenticated client/context is built exactly as in
      // production. Only attempted when the spec declares a test.
      const authVerifiable = Boolean(spec.test?.enabled);
      let authenticated: boolean | null = null;
      let authError: string | undefined;
      if (authVerifiable) {
        const testResult = (await actionsClient.execute({
          actionId: connectorId,
          params: { subAction: TEST_CONNECTOR_SUB_ACTION, subActionParams: {} },
        })) as ActionTypeExecutorResult<unknown>;
        authenticated = testResult.status === 'ok';
        if (!authenticated) {
          authError =
            testResult.message ?? testResult.serviceMessage ?? 'connector test failed';
        }
      }

      const actionNames = requestedActions ?? Object.keys(spec.actions ?? {});
      const results: ConnectorPreflightActionResult[] = actionNames.map((name) => {
        const action = spec.actions?.[name];
        if (!action) {
          return {
            action: name,
            ok: false,
            error: `Action "${name}" does not exist on connector type "${connector.actionTypeId}".`,
          };
        }
        if (authenticated === false) {
          return { action: name, ok: false, error: `Auth/scope check failed: ${authError}` };
        }
        return { action: name, ok: true, isTool: action.isTool === true, scope: action.scope };
      });

      logger.debug(
        `Connector preflight for "${connectorId}" (${connector.actionTypeId}): ` +
          `authVerified=${authVerifiable} authenticated=${authenticated} ` +
          `ok=${results.filter((r) => r.ok).length}/${results.length}`
      );

      return response.ok({
        body: {
          connectorId,
          connectorType: connector.actionTypeId,
          connectorName: connector.name,
          authVerified: authVerifiable,
          authenticated,
          results,
        },
      });
    }
  );
}
