/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EmulatorControl } from '@kbn/connector-emulate';
import type { RoleApiCredentials } from '@kbn/scout';
import { apiTest } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import {
  connectToEmulator,
  createConnector,
  deleteConnector,
  executeAction,
} from '../fixtures/emulated_connector';
import type { ReadAction } from '../fixtures/read_action';
import { findReadAction, setErrorStatus } from '../fixtures/read_action';

/**
 * The convention for how a connector reports what a vendor answers: a 404 is not an error, as
 * something not being there is an answer, and the statuses below are, as the action couldn't do what
 * it was asked. A connector reports an error by throwing, which Kibana returns as `status: 'error'`.
 */
const ERROR_STATUSES = [400, 401, 402, 429, 500, 502, 503, 504] as const;
const NOT_AN_ERROR_STATUS = 404;

/**
 * Connectors that still throw on a 404, which the convention says they shouldn't. Their 404 test
 * is expected to fail, so a connector that stops throwing makes it pass unexpectedly and fail the run
 * until its folder is removed from this list: the convention is enforced for it from then on.
 *
 * Tracked in https://github.com/elastic/kibana/issues/305181, which lists the connectors to fix, and
 * https://github.com/elastic/kibana/issues/304996 for VirusTotal, which has no suite here yet.
 */
const STILL_THROWS_ON_NOT_FOUND = new Set([
  'firecrawl',
  'brave_search',
  'shodan',
  'censys',
  'jina',
  'figma',
  'sentry',
  'grafana',
  'sublime_security',
]);

interface ConventionConnector {
  /** The connector's folder in `src/specs`. */
  readonly folder: string;
  readonly title: string;
  /** The connector's `metadata.id`. */
  readonly id: string;
  readonly config?: Record<string, unknown>;
  /** The secrets of a way to connect, with a credential that names the connector for the emulator. */
  readonly secrets: Record<string, unknown>;
}

const bearer = (name: string) => ({ authType: 'bearer', token: `emulate-${name}` });
const header = (name: string, field: string) => ({
  authType: 'api_key_header',
  [field]: `emulate-${name}`,
});

// A connector to test is added here, with the config it needs to be created. The CI step serves
// every connector with a vendor API manifest, so nothing else needs to change.
const CONNECTORS: readonly ConventionConnector[] = [
  { folder: 'firecrawl', title: 'Firecrawl', id: '.firecrawl', secrets: bearer('firecrawl') },
  {
    folder: 'brave_search',
    title: 'Brave Search',
    id: '.brave-search',
    secrets: header('brave-search', 'X-Subscription-Token'),
  },
  {
    folder: 'shodan',
    title: 'Shodan',
    id: '.shodan',
    secrets: header('shodan', 'X-Api-Key'),
  },
  {
    folder: 'censys',
    title: 'Censys',
    id: '.censys',
    config: { organizationId: '8f2c9a1e-4b7d-4e3a-9c5f-1d2e3f4a5b6c' },
    secrets: bearer('censys'),
  },
  { folder: 'jina', title: 'Jina Reader', id: '.jina', secrets: bearer('jina') },
  {
    folder: 'figma',
    title: 'Figma',
    id: '.figma',
    secrets: header('figma', 'X-Figma-Token'),
  },
  {
    folder: 'sentry',
    title: 'Sentry',
    id: '.sentry',
    config: { organizationSlug: 'elastic-demo' },
    secrets: bearer('sentry'),
  },
  {
    folder: 'grafana',
    title: 'Grafana',
    id: '.grafana',
    config: { baseUrl: 'https://your-stack.grafana.net' },
    secrets: bearer('grafana'),
  },
  {
    folder: 'sublime_security',
    title: 'Sublime Security',
    id: '.sublime_security',
    config: { baseUrl: 'https://platform.sublime.security' },
    secrets: bearer('sublime_security'),
  },
];

interface SetUpConnector {
  readonly connectorId: string;
  readonly control: EmulatorControl;
  readonly readAction: ReadAction;
}

/**
 * Makes the vendor answer a read action of each connector with each status in turn, through Kibana's
 * actions API against the connector emulator. See firecrawl_actions.spec.ts for how to start the
 * emulator and the Scout servers; the emulator must serve every connector in the table.
 */
apiTest.describe(
  'connectors report vendor errors by the convention through Kibana against the connector emulator',
  { tag: ['@local-stateful-classic'] },
  () => {
    let credentials: RoleApiCredentials;
    const connectors = new Map<string, SetUpConnector>();

    const setUp = (folder: string): SetUpConnector => {
      const connector = connectors.get(folder);
      if (!connector) {
        throw new Error(`${folder} wasn't set up`);
      }
      return connector;
    };

    apiTest.beforeAll(async ({ kbnClient, requestAuth }) => {
      credentials = await requestAuth.getApiKey('admin');
      for (const { folder, title, id, config, secrets } of CONNECTORS) {
        const name = id.replace(/^\./, '');
        connectors.set(folder, {
          control: await connectToEmulator(name),
          readAction: await findReadAction(folder, id),
          connectorId: await createConnector(kbnClient, {
            connectorTypeId: id,
            name: `${title} against the emulator`,
            config,
            secrets,
          }),
        });
      }
    });

    // Every test starts from no calls and no runtime fixtures.
    apiTest.beforeEach(async () => {
      await Promise.all([...connectors.values()].map(({ control }) => control.reset()));
    });

    apiTest.afterAll(async ({ kbnClient }) => {
      await Promise.all(
        [...connectors.values()].map(({ connectorId }) => deleteConnector(kbnClient, connectorId))
      );
    });

    for (const { folder, title } of CONNECTORS) {
      for (const status of ERROR_STATUSES) {
        apiTest(`${title}: a ${status} from the vendor is an error`, async ({ apiClient }) => {
          const { connectorId, control, readAction } = setUp(folder);
          await setErrorStatus(control, readAction.operation, status);

          const response = await executeAction(
            apiClient,
            credentials,
            connectorId,
            readAction.action,
            readAction.input
          );

          expect(response).toHaveStatusCode(200);
          expect(response.body).toMatchObject({ status: 'error', connector_id: connectorId });
        });
      }

      apiTest(
        `${title}: a ${NOT_AN_ERROR_STATUS} from the vendor is not an error`,
        async ({ apiClient }) => {
          apiTest.fail(
            STILL_THROWS_ON_NOT_FOUND.has(folder),
            'The connector still throws on a 404, which the convention says it should not'
          );
          const { connectorId, control, readAction } = setUp(folder);
          await setErrorStatus(control, readAction.operation, NOT_AN_ERROR_STATUS);

          const response = await executeAction(
            apiClient,
            credentials,
            connectorId,
            readAction.action,
            readAction.input
          );

          expect(response).toHaveStatusCode(200);
          expect(response.body).toMatchObject({ status: 'ok', connector_id: connectorId });
        }
      );
    }
  }
);
