# Scout Migration Pattern: Uptime and UX Plugins

This document contains the full file listing and contents from the uptime plugin's Scout tests (PR #253773) and the UX plugin's Scout tests (PR #253366).

**Note:** The uptime Scout structure exists in git history (commit 7c3f18c73b9b and related). The UX Scout structure exists on branch `migrate-ux-journeys-to-scout`. The current workspace may have partial or different content.

---

## UPTIME PLUGIN – Full File Listing

```
x-pack/solutions/observability/plugins/uptime/test/scout_uptime_legacy/ui/
├── es_archiver/
│   ├── browser/
│   │   ├── data.json.gz
│   │   └── mappings.json
│   ├── full_heartbeat/
│   │   ├── data.json.gz
│   │   └── mappings.json
│   └── synthetics_data/
│       ├── data.json.gz
│       └── mappings.json
├── fixtures/
│   ├── constants.ts
│   ├── index.ts
│   ├── helpers/
│   │   ├── make_checks.ts
│   │   ├── make_ping.ts
│   │   └── make_tls.ts
│   └── page_objects/
│       ├── index.ts
│       ├── monitor_details.ts
│       ├── uptime_overview.ts
│       └── uptime_settings.ts
├── playwright.config.ts
├── tsconfig.json
├── tsconfig.type_check.json
└── tests/
    ├── global.setup.ts
    ├── data_view_permissions.spec.ts
    ├── default_email_settings.spec.ts
    ├── monitor_alerts.spec.ts
    ├── monitor_details.spec.ts
    ├── observer_location.spec.ts
    ├── ping_redirects.spec.ts
    ├── step_duration.spec.ts
    ├── tls_alert_flyout.spec.ts
    └── uptime_overview.spec.ts
```

---

## UX PLUGIN – Full File Listing

```
x-pack/solutions/observability/plugins/ux/test/scout/ui/
├── fixtures/
│   ├── constants.ts
│   ├── index.ts
│   └── page_objects/
│       ├── index.ts
│       └── ux_dashboard.ts
├── playwright.config.ts
└── tests/
    ├── global.setup.ts
    ├── core_web_vitals.spec.ts
    ├── inp.spec.ts
    ├── page_views.spec.ts
    ├── ux_client_metrics.spec.ts
    ├── ux_js_errors.spec.ts
    ├── ux_long_task_metrics.spec.ts
    ├── ux_url_query.spec.ts
    └── ux_visitor_breakdown.spec.ts
```

---

## UPTIME – playwright.config.ts

```typescript
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPlaywrightConfig } from '@kbn/scout-oblt';

export default createPlaywrightConfig({
  testDir: './tests',
  runGlobalSetup: true,
});
```

---

## UPTIME – fixtures/index.ts

```typescript
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ObltTestFixtures, ObltWorkerFixtures } from '@kbn/scout-oblt';
import { test as baseTest, createLazyPageObject } from '@kbn/scout-oblt';
import { UptimeOverviewPage, MonitorDetailsPage, UptimeSettingsPage } from './page_objects';

export interface UptimeTestFixtures {
  pageObjects: ObltTestFixtures['pageObjects'] & {
    uptimeOverview: UptimeOverviewPage;
    monitorDetails: MonitorDetailsPage;
    uptimeSettings: UptimeSettingsPage;
  };
}

export const test = baseTest.extend<UptimeTestFixtures, ObltWorkerFixtures>({
  pageObjects: async ({ pageObjects, page }, use) => {
    const extendedPageObjects: UptimeTestFixtures['pageObjects'] = {
      ...pageObjects,
      uptimeOverview: createLazyPageObject(UptimeOverviewPage, page),
      monitorDetails: createLazyPageObject(MonitorDetailsPage, page),
      uptimeSettings: createLazyPageObject(UptimeSettingsPage, page),
    };

    await use(extendedPageObjects);
  },
});

export * as testData from './constants';
```

---

## UPTIME – fixtures/constants.ts

```typescript
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ES_ARCHIVES = {
  FULL_HEARTBEAT:
    'x-pack/solutions/observability/plugins/uptime/test/scout_uptime_legacy/ui/es_archiver/full_heartbeat',
  BROWSER:
    'x-pack/solutions/observability/plugins/uptime/test/scout_uptime_legacy/ui/es_archiver/browser',
} as const;
```

---

## UPTIME – fixtures/page_objects/index.ts

```typescript
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { UptimeOverviewPage } from './uptime_overview';
export { MonitorDetailsPage } from './monitor_details';
export { UptimeSettingsPage } from './uptime_settings';
```

---

## UPTIME – fixtures/page_objects/uptime_overview.ts

```typescript
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout-oblt';

export class UptimeOverviewPage {
  constructor(private readonly page: ScoutPage) {}

  async goto(params?: Record<string, string>): Promise<void> {
    await this.page.gotoApp('uptime', params ? { params } : undefined);
  }

  async waitForLoadingToFinish(): Promise<void> {
    await this.page.testSubj.waitForSelector('kbnLoadingMessage', { state: 'hidden' });
  }

  async clickSettingsLink(): Promise<void> {
    await this.page.testSubj.click('settings-page-link');
  }

  getHeartbeatIndicesInput() {
    return this.page.testSubj.locator('heartbeat-indices-input-loaded');
  }

  async setHeartbeatIndices(value: string): Promise<void> {
    await this.page.testSubj.locator('heartbeat-indices-input-loaded').fill(value);
    await this.page.testSubj.click('apply-settings-button');
  }

  async clickOverviewPage(): Promise<void> {
    await this.page.testSubj.click('uptimeOverviewPage');
  }

  async waitForMonitorTable(): Promise<void> {
    await this.page.testSubj.waitForSelector('uptimeOverviewPage', { state: 'visible' });
    await this.page.testSubj.waitForSelector('monitor-page-link-0001-up', {
      state: 'visible',
      timeout: 60_000,
    });
  }

  async clickMonitorLink(monitorId: string): Promise<void> {
    await this.page.testSubj.click(`monitor-page-link-${monitorId}`);
  }

  async clickExploreDataButton(): Promise<void> {
    await this.page.testSubj.click('uptimeExploreDataButton');
  }
}
```

---

## UPTIME – fixtures/page_objects/monitor_details.ts

```typescript
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout-oblt';

interface AlertType {
  id: string;
  threshold: string;
}

export class MonitorDetailsPage {
  constructor(private readonly page: ScoutPage) {}

  async navigateToOverviewPage(params?: Record<string, string>): Promise<void> {
    await this.page.gotoApp('uptime', params ? { params } : undefined);
  }

  async waitForLoadingToFinish(): Promise<void> {
    await this.page.testSubj.waitForSelector('kbnLoadingMessage', { state: 'hidden' });
  }

  async navigateToMonitorDetails(monitorId: string): Promise<void> {
    await this.page.testSubj.click(`monitor-page-link-${monitorId}`);
  }

  async selectFilterItem(filterType: string, itemArg: string | string[]): Promise<void> {
    const itemList = Array.isArray(itemArg) ? itemArg : [itemArg];
    await this.page.click(`[aria-label="expands filter group for ${filterType} filter"]`);
    for (const title of itemList) {
      await this.page.click(`li[title="${title}"]`);
    }
    await this.page.click(`[aria-label="Apply the selected filters for ${filterType}"]`);
  }

  async setStatusFilterUp(): Promise<void> {
    await this.page.testSubj.click('xpack.synthetics.filterBar.filterStatusUp');
  }

  getMonitorRedirects() {
    return this.page.testSubj.locator('uptimeMonitorRedirectInfo');
  }

  async expandPingDetails(): Promise<void> {
    await this.page.testSubj.click('uptimePingListExpandBtn');
  }

  async enableAnomalyDetection(): Promise<void> {
    await this.page.testSubj.locator('uptimeEnableAnomalyBtn').click();
  }

  async createMLJob(): Promise<void> {
    await this.page.testSubj.locator('uptimeMLCreateJobBtn').click();
    await this.page.testSubj.locator('toastCloseButton').click({ timeout: 20_000 });
    await this.page.testSubj.locator('ruleDefinition').waitFor({ timeout: 20_000 });
  }

  async updateAlert({ id, threshold }: AlertType): Promise<void> {
    await this.selectAlertThreshold(threshold);
    await this.page.testSubj.click('ruleFormStep-details');
    await this.page.testSubj.locator('ruleDetailsNameInput').clear();
    await this.page.testSubj.locator('ruleDetailsNameInput').fill(id);
  }

  async selectAlertThreshold(threshold: string): Promise<void> {
    await this.page.testSubj.click('ruleFormStep-definition');
    await this.page.testSubj.click('uptimeAnomalySeverity');
    await this.page.testSubj.click('anomalySeveritySelect');
    await this.page.click(`text=${threshold}`);
  }

  async saveRule(): Promise<void> {
    await this.page.testSubj.click('ruleFlyoutFooterSaveButton');
    await this.page.testSubj.click('confirmModalConfirmButton');
  }

  async waitForPingListItem(pingId: string): Promise<void> {
    await this.page.testSubj.locator(`xpack.synthetics.pingList.ping-${pingId}`).waitFor();
  }
}
```

---

## UPTIME – fixtures/page_objects/uptime_settings.ts

```typescript
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout-oblt';

export class UptimeSettingsPage {
  constructor(private readonly page: ScoutPage) {}

  async goto(params?: Record<string, string>): Promise<void> {
    await this.page.gotoApp('uptime/settings', params ? { params } : undefined);
  }

  async waitForLoadingToFinish(): Promise<void> {
    await this.page.testSubj.waitForSelector('kbnLoadingMessage', { state: 'hidden' });
  }

  async waitForDefaultConnectorsLoaded(): Promise<void> {
    await this.page.testSubj.locator('default-connectors-input-loaded').waitFor();
  }

  async clearDefaultConnectors(): Promise<void> {
    const clearConnectors = this.page.locator(
      '[data-test-subj="default-connectors-input-loaded"] >> [data-test-subj="comboBoxClearButton"]'
    );
    if (await clearConnectors.isVisible()) {
      await clearConnectors.click();
    }
  }

  async clearToEmailAddresses(): Promise<void> {
    const clearToEmail = this.page.locator(
      '[data-test-subj=toEmailAddressInput] >> [data-test-subj=comboBoxClearButton]'
    );
    if (await clearToEmail.isVisible()) {
      await clearToEmail.click();
    }
  }

  async fillToEmail(text: string): Promise<void> {
    await this.page.testSubj.locator('toEmailAddressInput').locator('input').fill(text);
    await this.page.testSubj.locator('toEmailAddressInput').locator('input').press('Enter');
  }

  async clickSaveSettings(): Promise<void> {
    await this.page.testSubj.click('apply-settings-button');
    await this.waitForLoadingToFinish();
  }

  getApplyButton() {
    return this.page.testSubj.locator('apply-settings-button');
  }

  async removeInvalidEmail(invalidEmail: string): Promise<void> {
    await this.page
      .locator(`[title="Remove ${invalidEmail} from selection in this group"]`)
      .click();
  }

  async createEmailConnector(config: {
    name: string;
    from: string;
    host: string;
    port: string;
  }): Promise<void> {
    await this.page.testSubj.click('createConnectorButton');
    await this.page.testSubj.locator('createConnectorsModalSearch').waitFor();
    await this.page.testSubj.click('.email-card');
    await this.page.testSubj.waitForSelector('.email-card', { state: 'hidden' });
    await this.page.testSubj.locator('nameInput').fill(config.name);
    await this.page.testSubj.locator('emailFromInput').fill(config.from);
    await this.page.testSubj.locator('emailServiceSelectInput').selectOption('other');
    await this.page.testSubj.locator('emailHostInput').fill(config.host);
    await this.page.testSubj.locator('emailPortInput').fill(config.port);
    await this.page.testSubj.click('input');
    await this.page.testSubj.click('create-connector-flyout-save-btn');
    await this.page.testSubj.waitForSelector('nameInput', { state: 'hidden' });
  }

  async selectDefaultConnector(name: string): Promise<void> {
    await this.page.testSubj.click('default-connectors-input-loaded');
    await this.page.testSubj.click(`${name}`);
  }
}
```

---

## UPTIME – fixtures/helpers/make_checks.ts

```typescript
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { merge } from 'lodash';
import type { EsClient } from '@kbn/scout-oblt';
import { makePing } from './make_ping';
import type { TlsProps } from './make_tls';

interface CheckProps {
  es: EsClient;
  monitorId?: string;
  numIps?: number;
  fields?: { [key: string]: any };
  mogrify?: (doc: any) => any;
  refresh?: boolean;
  tls?: boolean | TlsProps;
  isFleetManaged?: boolean;
}

const getRandomMonitorId = () => {
  return 'monitor-' + Math.random().toString(36).substring(7);
};

export const makeCheck = async ({
  es,
  monitorId = getRandomMonitorId(),
  numIps = 1,
  fields = {},
  mogrify = (d) => d,
  refresh = true,
  tls = false,
  isFleetManaged = false,
}: CheckProps): Promise<{ monitorId: string; docs: any }> => {
  const cgFields = {
    monitor: {
      check_group: uuidv4(),
    },
  };

  const docs = [];
  const summary = {
    up: 0,
    down: 0,
  };
  for (let i = 0; i < numIps; i++) {
    const pingFields = merge(fields, cgFields, {
      monitor: {
        ip: `127.0.0.${i}`,
      },
    });
    if (i === numIps - 1) {
      pingFields.summary = summary;
    }
    const doc = await makePing(
      es,
      monitorId,
      pingFields,
      mogrify,
      false,
      tls as any,
      isFleetManaged
    );
    docs.push(doc);
    // @ts-ignore
    summary[doc.monitor.status]++;
  }

  if (refresh) {
    await es.indices.refresh();
  }

  return { monitorId, docs };
};

export const makeChecks = async (
  es: EsClient,
  monitorId: string,
  numChecks: number = 1,
  numIps: number = 1,
  every: number = 10000,
  fields: { [key: string]: any } = {},
  mogrify: (doc: any) => any = (d) => d,
  refresh: boolean = true,
  isFleetManaged: boolean = false
) => {
  const checks = [];
  const oldestTime = new Date().getTime() - numChecks * every;
  let newestTime = oldestTime;
  for (let li = 0; li < numChecks; li++) {
    const checkDate = new Date(newestTime + every);
    newestTime = checkDate.getTime() + every;
    fields = merge(fields, {
      '@timestamp': checkDate.toISOString(),
      monitor: {
        timespan: {
          gte: checkDate.toISOString(),
          lt: new Date(newestTime).toISOString(),
        },
      },
    });
    const { docs } = await makeCheck({
      es,
      monitorId,
      numIps,
      fields,
      mogrify,
      refresh: false,
      isFleetManaged,
    });
    checks.push(docs);
  }

  if (refresh) {
    await es.indices.refresh();
  }

  return checks;
};

export const makeChecksWithStatus = async (
  es: EsClient,
  monitorId: string,
  numChecks: number,
  numIps: number,
  every: number,
  fields: { [key: string]: any } = {},
  status: 'up' | 'down',
  mogrify: (doc: any) => any = (d) => d,
  refresh: boolean = true,
  isFleetManaged: boolean = false
) => {
  const oppositeStatus = status === 'up' ? 'down' : 'up';

  return await makeChecks(
    es,
    monitorId,
    numChecks,
    numIps,
    every,
    fields,
    (d) => {
      d.monitor.status = status;
      if (d.summary) {
        d.summary[status] += d.summary[oppositeStatus];
        d.summary[oppositeStatus] = 0;
      }

      return mogrify(d);
    },
    refresh,
    isFleetManaged
  );
};
```

---

## UPTIME – fixtures/helpers/make_ping.ts

```typescript
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { merge } from 'lodash';
import type { EsClient } from '@kbn/scout-oblt';
import type { TlsProps } from './make_tls';
import { makeTls } from './make_tls';

const DEFAULT_INDEX_NAME = 'heartbeat-8-full-test';
const DATA_STREAM_INDEX_NAME = 'synthetics-http-default';

export const makePing = async (
  es: EsClient,
  monitorId: string,
  fields: { [key: string]: any },
  mogrify: (doc: any) => any,
  refresh: boolean = true,
  tls: boolean | TlsProps = false,
  isFleetManaged: boolean | undefined = false
) => {
  const timestamp = new Date();
  const baseDoc: any = {
    tcp: {
      rtt: {
        connect: {
          us: 14687,
        },
      },
    },
    observer: {
      geo: {
        name: 'mpls',
        location: '37.926868, -78.024902',
      },
      hostname: 'avc-x1e',
    },
    agent: {
      hostname: 'avc-x1e',
      id: '10730a1a-4cb7-45ce-8524-80c4820476ab',
      type: 'heartbeat',
      ephemeral_id: '0d9a8dc6-f604-49e3-86a0-d8f9d6f2cbad',
      version: '8.0.0',
    },
    '@timestamp': timestamp.toISOString(),
    resolve: {
      rtt: {
        us: 350,
      },
      ip: '127.0.0.1',
    },
    ecs: {
      version: '1.1.0',
    },
    host: {
      name: 'avc-x1e',
    },
    http: {
      rtt: {
        response_header: {
          us: 19349,
        },
        total: {
          us: 48954,
        },
        write_request: {
          us: 33,
        },
        content: {
          us: 51,
        },
        validate: {
          us: 19400,
        },
      },
      response: {
        status_code: 200,
        body: {
          bytes: 3,
          hash: '27badc983df1780b60c2b3fa9d3a19a00e46aac798451f0febdca52920faaddf',
        },
      },
    },
    monitor: {
      duration: {
        us: 49347,
      },
      ip: '127.0.0.1',
      id: monitorId,
      check_group: uuidv4(),
      type: 'http',
      status: 'up',
      timespan: {
        gte: timestamp.toISOString(),
        lt: new Date(timestamp.getTime() + 5000).toISOString(),
      },
    },
    event: {
      dataset: 'uptime',
    },
    url: {
      path: '/pattern',
      scheme: 'http',
      port: 5678,
      domain: 'localhost',
      query: 'r=200x5,500x1',
      full: 'http://localhost:5678/pattern?r=200x5,500x1',
    },
  };

  if (tls) {
    baseDoc.tls = makeTls(tls as any);
  }

  const doc = mogrify(merge(baseDoc, fields));

  await es.index({
    index: isFleetManaged ? DATA_STREAM_INDEX_NAME : DEFAULT_INDEX_NAME,
    refresh,
    body: doc,
  });
  return doc;
};
```

---

## UPTIME – fixtures/helpers/make_tls.ts

```typescript
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import crypto from 'crypto';

export interface TlsProps {
  valid?: boolean;
  commonName?: string;
  expiry?: string;
  sha256?: string;
}

export const getSha256 = () => {
  return crypto.randomBytes(64).toString('hex').toUpperCase();
};

export const makeTls = ({
  valid = true,
  commonName = '*.elastic.co',
  expiry,
  sha256,
}: TlsProps) => {
  const expiryDate =
    expiry ??
    moment()
      .add(valid ? 2 : -2, 'months')
      .toISOString();

  return {
    version: '1.3',
    cipher: 'TLS-AES-128-GCM-SHA256',
    server: {
      x509: {
        not_before: '2020-03-01T00:00:00.000Z',
        not_after: expiryDate,
        issuer: {
          distinguished_name:
            'CN=DigiCert SHA2 High Assurance Server CA,OU=www.digicert.com,O=DigiCert Inc,C=US',
          common_name: 'DigiCert SHA2 High Assurance Server CA',
        },
        subject: {
          common_name: commonName,
          distinguished_name: 'CN=*.facebook.com,O=Facebook Inc.,L=Menlo Park,ST=California,C=US',
        },
        serial_number: '10043199409725537507026285099403602396',
        signature_algorithm: 'SHA256-RSA',
        public_key_algorithm: 'ECDSA',
        public_key_curve: 'P-256',
      },
      hash: {
        sha256: sha256 ?? '1a48f1db13c3bd1482ba1073441e74a1bb1308dc445c88749e0dc4f1889a88a4',
        sha1: '23291c758d925b9f4bb3584de3763317e94c6ce9',
      },
    },
    established: true,
    rtt: {
      handshake: {
        us: 12345,
      },
    },
    version_protocol: 'tls',
  };
};
```

---

## UPTIME – tests/global.setup.ts

```typescript
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { globalSetupHook, tags } from '@kbn/scout-oblt';
import { testData } from '../fixtures';

globalSetupHook(
  'Ingest Uptime test data',
  { tag: tags.stateful.classic },
  async ({ esArchiver, log }) => {
    log.info('[setup] Loading ES archives for Uptime Scout tests...');
    await esArchiver.loadIfNeeded(testData.ES_ARCHIVES.FULL_HEARTBEAT);
    await esArchiver.loadIfNeeded(testData.ES_ARCHIVES.BROWSER);
    log.info('[setup] Uptime ES archives loaded successfully');
  }
);
```

---

## UPTIME – tsconfig.json

```json
{
  "extends": "@kbn/tsconfig-base/tsconfig.json",
  "exclude": ["tmp", "target/**/*"],
  "include": ["**/*"],
  "compilerOptions": {
    "outDir": "target/types",
    "types": ["node"],
    "isolatedModules": false
  },
  "kbn_references": [
    "@kbn/scout-oblt"
  ]
}
```

---

## UPTIME – tests/uptime_overview.spec.ts

```typescript
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../fixtures';

test.describe('UptimeOverview', { tag: '@local-stateful-classic' }, () => {
  test('navigates to overview and clicks monitor', async ({ pageObjects, browserAuth, page }) => {
    await browserAuth.loginAsAdmin();

    await test.step('configure heartbeat indices', async () => {
      await pageObjects.uptimeOverview.goto({ dateRangeStart: '2018-01-01', dateRangeEnd: 'now' });
      await pageObjects.uptimeOverview.clickSettingsLink();
      await pageObjects.uptimeOverview.waitForLoadingToFinish();
      await expect(page.testSubj.locator('heartbeat-indices-input-loaded')).toHaveValue(
        'heartbeat-*'
      );
    });

    await test.step('navigate to overview and click monitor', async () => {
      await pageObjects.uptimeOverview.goto({ dateRangeStart: '2018-01-01', dateRangeEnd: 'now' });
      await pageObjects.uptimeOverview.waitForMonitorTable();
      await pageObjects.uptimeOverview.clickMonitorLink('0001-up');
      await expect(page.testSubj.locator('uptimePingListTable')).toBeVisible();
    });
  });
});
```

---

## UPTIME – tests/monitor_details.spec.ts

```typescript
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../fixtures';

const dateRangeStart = '2019-09-10T12:40:08.078Z';
const dateRangeEnd = '2019-09-11T19:40:08.078Z';
const monitorId = '0000-intermittent';

test.describe('MonitorDetails', { tag: '@local-stateful-classic' }, () => {
  test('navigates to monitor details and displays ping data', async ({
    pageObjects,
    browserAuth,
    page,
  }) => {
    await browserAuth.loginAsViewer();
    await pageObjects.monitorDetails.navigateToOverviewPage({ dateRangeEnd, dateRangeStart });
    await pageObjects.monitorDetails.navigateToMonitorDetails(monitorId);
    await pageObjects.monitorDetails.waitForLoadingToFinish();

    await test.step('filter by location and status', async () => {
      await pageObjects.monitorDetails.selectFilterItem('Location', 'mpls');
      await pageObjects.monitorDetails.setStatusFilterUp();
    });

    await test.step('verify ping list items', async () => {
      const pingIds = [
        'XZtoHm0B0I9WX_CznN-6',
        '7ZtoHm0B0I9WX_CzJ96M',
        'pptnHm0B0I9WX_Czst5X',
        'I5tnHm0B0I9WX_CzPd46',
        'y5tmHm0B0I9WX_Czx93x',
        'XZtmHm0B0I9WX_CzUt3H',
        '-JtlHm0B0I9WX_Cz3dyX',
        'k5tlHm0B0I9WX_CzaNxm',
        'NZtkHm0B0I9WX_Cz89w9',
        'zJtkHm0B0I9WX_CzftsN',
      ];

      await Promise.all(pingIds.map((id) => pageObjects.monitorDetails.waitForPingListItem(id)));
      await expect(
        page.testSubj.locator('uptimeWithResponsiveWrapper--panel').locator('.echChart')
      ).toBeVisible({
        timeout: 20_000,
      });
    });
  });
});
```

---

## UPTIME – tests/monitor_alerts.spec.ts

```typescript
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../fixtures';

const dateRangeStart = '2019-09-10T12:40:08.078Z';
const dateRangeEnd = '2019-09-11T19:40:08.078Z';
const monitorId = '0000-intermittent';
const alertId = 'uptime-anomaly-alert';
const alertThreshold = 'major';

const mlJobId = '0000_intermittent_high_latency_by_geo';

test.describe('MonitorAlerts', { tag: tags.stateful.classic }, () => {
  test.afterAll(async ({ apiServices }) => {
    await apiServices.ml.deleteJobs({
      jobIds: [mlJobId],
      deleteUserAnnotations: true,
      deleteAlertingRules: true,
    });
  });

  test('creates and manages anomaly detection alert', async ({
    browserAuth,
    pageObjects,
    page,
  }) => {
    await test.step('go to monitor details', async () => {
      await browserAuth.loginAsAdmin();
      await pageObjects.monitorDetails.navigateToOverviewPage({ dateRangeEnd, dateRangeStart });
      await pageObjects.monitorDetails.navigateToMonitorDetails(monitorId);
      await pageObjects.monitorDetails.waitForLoadingToFinish();
    });

    await test.step('open anomaly detection flyout and verify no license error', async () => {
      await pageObjects.monitorDetails.enableAnomalyDetection();
      await expect(page.testSubj.locator('uptimeMLCreateJobBtn')).toBeEnabled();
      await expect(page.testSubj.locator('uptimeMLLicenseInfo')).toBeHidden();
    });

    await test.step('create ML job', async () => {
      await pageObjects.monitorDetails.createMLJob();
      await expect(page.testSubj.locator('ruleDefinitionHeaderRuleTypeName')).toHaveText(
        'Uptime Duration Anomaly'
      );
    });

    await test.step('update anomaly detection alert and create rule', async () => {
      await pageObjects.monitorDetails.updateAlert({ id: alertId, threshold: alertThreshold });
      await pageObjects.monitorDetails.saveRule();
      await expect(page.getByText(`Created rule "${alertId}"`)).toBeVisible({ timeout: 20_000 });
    });

    await test.step('go to ML management page and find job', async () => {
      await page.gotoApp('management/ml/anomaly_detection');
      await page.testSubj.locator('mlJobListColumnId').waitFor();
      await expect(page.testSubj.locator('mlJobListColumnId')).toHaveCount(1);
      await expect(
        page.testSubj.locator('mlJobListColumnId').locator('.euiTableCellContent')
      ).toHaveText(mlJobId);
    });
  });
});
```

---

## UPTIME – tests/data_view_permissions.spec.ts

```typescript
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../fixtures';

const queryParams = {
  dateRangeStart: '2021-11-21T22:06:06.502Z',
  dateRangeEnd: '2021-11-21T22:10:08.203Z',
};

test.describe('DataViewPermissions', { tag: '@local-stateful-classic' }, () => {
  test.beforeAll(async ({ kbnClient }) => {
    try {
      await kbnClient.savedObjects.delete({
        type: 'index-pattern',
        id: 'synthetics_static_index_pattern_id_heartbeat_',
      });
    } catch {
      // Ignore - may not exist
    }
  });

  test('renders exploratory view for viewer user', async ({ pageObjects, browserAuth, page }) => {
    await browserAuth.loginAsViewer();
    await pageObjects.uptimeOverview.goto(queryParams);

    await pageObjects.uptimeOverview.clickExploreDataButton();
    await pageObjects.uptimeOverview.waitForLoadingToFinish();

    await expect(page.getByText('browser')).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText('Monitor duration')).toBeVisible();
  });
});
```

---

## UPTIME – tests/default_email_settings.spec.ts

```typescript
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../fixtures';

const queryParams = {
  dateRangeStart: '2021-11-21T22:06:06.502Z',
  dateRangeEnd: '2021-11-21T22:10:08.203Z',
};

test.describe('DefaultEmailSettings', { tag: '@local-stateful-classic' }, () => {
  const name = `Test connector ${Date.now()}`;
  test('configures email connector and validates settings', async ({
    pageObjects,
    browserAuth,
    page,
  }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.uptimeSettings.goto(queryParams);

    await test.step('no connector is defined by default', async () => {
      await pageObjects.uptimeSettings.waitForDefaultConnectorsLoaded();
      await expect(
        page.testSubj.locator('default-connectors-input-loaded').locator('input')
      ).toHaveValue('');
    });

    await test.step('create email connector', async () => {
      await pageObjects.uptimeSettings.createEmailConnector({
        name,
        from: 'test@gmail.com',
        host: 'test',
        port: '1025',
      });
    });

    await test.step('select email connector and validate required fields', async () => {
      await expect(page.getByText('Bcc')).toBeHidden();
      await pageObjects.uptimeSettings.selectDefaultConnector(name);
      await expect(page.getByText('Bcc')).toBeVisible();
      await expect(page.locator('.euiFormErrorText')).toHaveText(
        'To email is required for email connector'
      );

      await expect(pageObjects.uptimeSettings.getApplyButton()).toBeDisabled();
      await pageObjects.uptimeSettings.fillToEmail('test@gmail.com');
      await expect(pageObjects.uptimeSettings.getApplyButton()).toBeEnabled();
    });

    await test.step('validate invalid email handling', async () => {
      await pageObjects.uptimeSettings.fillToEmail('test@gmail');
      await expect(page.locator('.euiFormErrorText')).toHaveText(
        'test@gmail is not a valid email.'
      );
      await expect(pageObjects.uptimeSettings.getApplyButton()).toBeDisabled();
      await pageObjects.uptimeSettings.removeInvalidEmail('test@gmail');
    });

    await test.step('save settings', async () => {
      await pageObjects.uptimeSettings.clickSaveSettings();
      await expect(page.getByText('Settings saved!')).toBeVisible();
    });
  });
});
```

---

## UPTIME – tests/observer_location.spec.ts

```typescript
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../fixtures';
import { makeChecksWithStatus } from '../fixtures/helpers/make_checks';

const NO_LOCATION_MONITOR_ID = 'location-testing-id';
const LESS_AVAIL_MONITOR_ID = 'less-availability-monitor';

test.describe('Observer location', { tag: '@local-stateful-classic' }, () => {
  test.beforeAll(async ({ esClient }) => {
    const mogrifyNoLocation = (d: any) => {
      if (d.observer?.geo?.location) {
        d.observer.geo.location = undefined;
      }
      return d;
    };
    await makeChecksWithStatus(
      esClient,
      NO_LOCATION_MONITOR_ID,
      5,
      2,
      10000,
      {},
      'up',
      mogrifyNoLocation
    );

    await makeChecksWithStatus(esClient, LESS_AVAIL_MONITOR_ID, 5, 2, 10000, {}, 'up');
    await makeChecksWithStatus(esClient, LESS_AVAIL_MONITOR_ID, 5, 2, 10000, {}, 'down');
  });

  test('displays the overall availability for no location monitor', async ({
    pageObjects,
    browserAuth,
    page,
  }) => {
    await browserAuth.loginAsViewer();
    await pageObjects.monitorDetails.navigateToOverviewPage();
    await pageObjects.monitorDetails.navigateToMonitorDetails(NO_LOCATION_MONITOR_ID);
    await pageObjects.monitorDetails.waitForLoadingToFinish();
    await expect(page.testSubj.locator('uptimeOverallAvailability')).toHaveText('100.00 %');
  });

  test('displays less monitor availability', async ({ pageObjects, browserAuth, page }) => {
    await browserAuth.loginAsViewer();
    await pageObjects.monitorDetails.navigateToOverviewPage();
    await pageObjects.monitorDetails.navigateToMonitorDetails(LESS_AVAIL_MONITOR_ID);
    await pageObjects.monitorDetails.waitForLoadingToFinish();
    await expect(page.testSubj.locator('uptimeOverallAvailability')).toHaveText('50.00 %');
  });
});
```

---

## UPTIME – tests/ping_redirects.spec.ts

```typescript
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../fixtures';
import { makeChecksWithStatus } from '../fixtures/helpers/make_checks';

const testMonitor = {
  id: '0000-intermittent',
  start: 'now-15m',
  end: 'now',
  redirects: ['http://localhost:3000/first', 'https://www.washingtonpost.com/'],
};

test.describe('MonitorPingRedirects', { tag: '@local-stateful-classic' }, () => {
  test.beforeAll(async ({ esClient }) => {
    await makeChecksWithStatus(
      esClient,
      testMonitor.id,
      5,
      2,
      10000,
      {
        http: {
          rtt: { total: { us: 157784 } },
          response: {
            status_code: 200,
            redirects: testMonitor.redirects,
            body: {
              bytes: 642102,
              hash: '597a8cfb33ff8e09bff16283306553c3895282aaf5386e1843d466d44979e28a',
            },
          },
        },
      },
      'up'
    );
  });

  test('displays redirect info in detail panel and ping list', async ({
    pageObjects,
    browserAuth,
    page,
  }) => {
    await browserAuth.loginAsViewer();
    await pageObjects.monitorDetails.navigateToOverviewPage({
      dateRangeEnd: testMonitor.end,
      dateRangeStart: testMonitor.start,
    });
    await pageObjects.monitorDetails.navigateToMonitorDetails(testMonitor.id);
    await pageObjects.monitorDetails.waitForLoadingToFinish();

    await expect(pageObjects.monitorDetails.getMonitorRedirects()).toHaveText(
      `${testMonitor.redirects.length}`
    );

    await pageObjects.monitorDetails.expandPingDetails();
    await pageObjects.monitorDetails.waitForLoadingToFinish();
    await page.testSubj.locator('uptimeMonitorPingListRedirectInfo').waitFor();
  });
});
```

---

## UPTIME – tests/step_duration.spec.ts

```typescript
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../fixtures';

const queryParams = {
  dateRangeStart: '2021-11-21T22:06:06.502Z',
  dateRangeEnd: '2021-11-21T22:10:08.203Z',
};

test.describe('StepsDuration', { tag: '@local-stateful-classic' }, () => {
  test('navigates to monitor details and verifies step duration', async ({
    pageObjects,
    browserAuth,
    page,
  }) => {
    await browserAuth.loginAsViewer();
    await pageObjects.uptimeOverview.goto(queryParams);

    await test.step('navigate to monitor details', async () => {
      await page.getByText('test-monitor - inline').click();
      await expect(page).toHaveURL(/\/app\/uptime\/monitor\/dGVzdC1tb25pdG9yLWlubGluZQ/);
    });

    await test.step('navigate to journey steps', async () => {
      const stepsLocator = page.locator('table .euiTableRow-isClickable');
      await expect(stepsLocator).toHaveCount(4);
      // eslint-disable-next-line playwright/no-nth-methods
      await stepsLocator.first().click();
      await expect(page).toHaveURL(
        /\/app\/uptime\/journey\/9f217c22-4b17-11ec-b976-aa665a54da40\/steps/
      );
    });

    await test.step('verify step duration chart', async () => {
      await expect(async () => {
        // eslint-disable-next-line playwright/no-nth-methods
        await page.testSubj.locator('syntheticsStepDurationButton').first().hover();
        await expect(page.testSubj.locator('uptimeExploreDataButton')).toBeVisible();
        await expect(page.testSubj.locator('lens-embeddable')).toBeVisible();
      }).toPass({ timeout: 60_000 });
    });
  });
});
```

---

## UPTIME – tests/tls_alert_flyout.spec.ts

```typescript
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../fixtures';

test.describe('TlsFlyoutInAlertingApp', { tag: '@local-stateful-classic' }, () => {
  test('opens TLS alert flyout and verifies setting values', async ({
    pageObjects,
    browserAuth,
    page,
  }) => {
    await browserAuth.loginAsAdmin();
    await page.gotoApp('management/insightsAndAlerting/triggersActions/rules');
    await page.testSubj.locator('createRuleButton').waitFor({ timeout: 20_000 });

    await test.step('open TLS certificate rule flyout', async () => {
      await page.testSubj.locator('createRuleButton').click();
      await page.testSubj.click('xpack.uptime.alerts.tlsCertificate-SelectOption');
      await page.testSubj.waitForSelector('xpack.synthetics.alerts.monitorStatus.filterBar', {
        state: 'visible',
      });
      await pageObjects.uptimeOverview.waitForLoadingToFinish();
    });

    await test.step('verify TLS threshold values', async () => {
      await expect(page.getByText('has a certificate expiring within')).toBeVisible();
      await expect(page.testSubj.locator('tlsExpirationThreshold')).toHaveText(
        'has a certificate expiring within days:  30'
      );
      await expect(page.testSubj.locator('tlsAgeExpirationThreshold')).toHaveText(
        'or older than days:  730'
      );
    });
  });
});
```

---

# UX PLUGIN – Full Contents

---

## UX – playwright.config.ts

```typescript
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPlaywrightConfig } from '@kbn/scout-oblt';

export default createPlaywrightConfig({
  testDir: './tests',
  runGlobalSetup: true,
});
```

---

## UX – fixtures/index.ts

```typescript
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ObltTestFixtures, ObltWorkerFixtures } from '@kbn/scout-oblt';
import { test as baseTest, createLazyPageObject } from '@kbn/scout-oblt';
import { UxDashboardPage } from './page_objects';

export interface UxTestFixtures {
  pageObjects: ObltTestFixtures['pageObjects'] & {
    uxDashboard: UxDashboardPage;
  };
}

export const test = baseTest.extend<UxTestFixtures>({
  pageObjects: async (
    {
      pageObjects,
      page,
      kbnUrl,
    }: {
      pageObjects: ObltTestFixtures['pageObjects'];
      page: ObltTestFixtures['page'];
      kbnUrl: ObltWorkerFixtures['kbnUrl'];
    },
    use: (pageObjects: UxTestFixtures['pageObjects']) => Promise<void>
  ) => {
    const extendedPageObjects: UxTestFixtures['pageObjects'] = {
      ...pageObjects,
      uxDashboard: createLazyPageObject(UxDashboardPage, page, kbnUrl),
    };

    await use(extendedPageObjects);
  },
});

export * as testData from './constants';
```

---

## UX – fixtures/constants.ts

```typescript
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ES_ARCHIVES = {
  RUM_8_0_0: 'x-pack/solutions/observability/plugins/ux/e2e/fixtures/rum_8.0.0',
  RUM_TEST_DATA: 'x-pack/solutions/observability/plugins/ux/e2e/fixtures/rum_test_data',
};

export const UX_APP_PATH = '/app/ux';

export const DEFAULT_QUERY_PARAMS = {
  percentile: '50',
  rangeFrom: '2020-05-18T11:51:00.000Z',
  rangeTo: '2021-10-30T06:37:15.536Z',
};
```

---

## UX – fixtures/page_objects/index.ts

```typescript
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { UxDashboardPage } from './ux_dashboard';
```

---

## UX – fixtures/page_objects/ux_dashboard.ts

```typescript
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaUrl, ScoutPage } from '@kbn/scout-oblt';
import { UX_APP_PATH, DEFAULT_QUERY_PARAMS } from '../constants';

export class UxDashboardPage {
  constructor(private readonly page: ScoutPage, private readonly kbnUrl: KibanaUrl) {}

  async goto(queryParams: Record<string, string> = DEFAULT_QUERY_PARAMS): Promise<void> {
    const queryString = new URLSearchParams(queryParams).toString();
    await this.page.goto(this.kbnUrl.get(`${UX_APP_PATH}?${queryString}`));
  }

  async waitForLoadingToFinish(): Promise<void> {
    await this.page.testSubj.locator('kbnLoadingMessage').waitFor({ state: 'hidden' });
    await this.page.waitForLoadingIndicatorHidden();
  }

  async waitForChartData(): Promise<void> {
    await this.page.waitForFunction(
      () => document.querySelectorAll('.euiLoadingChart').length === 0,
      null,
      { timeout: 30000 }
    );
  }

  async scrollToBottom(): Promise<void> {
    await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  }

  lensEmbeddableLocator(dataTestId: string) {
    return this.page.locator(`[data-test-embeddable-id="${dataTestId}"]`);
  }

  embeddablePanelMenuIcon(containerSelector: string) {
    return this.page.locator(
      `${containerSelector} [data-test-subj="embeddablePanelToggleMenuIcon"]`
    );
  }
}
```

---

## UX – tests/global.setup.ts

```typescript
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { globalSetupHook, tags } from '@kbn/scout-oblt';
import { testData } from '../fixtures';

globalSetupHook(
  'Ingest UX test data',
  { tag: tags.stateful.classic },
  async ({ esArchiver, esClient, log }) => {
    const archives = [testData.ES_ARCHIVES.RUM_8_0_0, testData.ES_ARCHIVES.RUM_TEST_DATA];

    log.debug('[setup] loading UX test data (only if indexes do not exist)...');
    for (const archive of archives) {
      await esArchiver.loadIfNeeded(archive);
    }

    log.debug('[setup] indexing INP test transactions...');
    await indexInpTestData(esClient);
  }
);

const INP_VALUES = [
  482, 343, 404, 591, 545, 789, 664, 721, 442, 376, 797, 580, 749, 363, 673, 141, 234, 638, 378,
  448, 175, 543, 665, 146, 742, 686, 210, 324, 365, 192, 301, 317, 728, 655, 427, 66, 741, 357, 732,
  93, 592, 200, 636, 122, 695, 709, 322, 296, 196, 188, 139, 346, 637, 315, 756, 139, 97, 411, 98,
  695, 615, 394, 619, 713, 100, 373, 730, 226, 270, 168, 740, 65, 215, 383, 614, 154, 645, 661, 594,
  71, 264, 377, 599, 92, 771, 474, 566, 106, 192, 491, 121, 210, 690, 310, 753, 266, 289, 743, 134,
  100,
];

function getPageLoadDocument() {
  return {
    '@timestamp': new Date(Date.now()).toISOString(),
    agent: { name: 'rum-js', version: '5.1.1' },
    client: {
      geo: {
        continent_name: 'North America',
        country_iso_code: 'US',
        location: { lat: 37.751, lon: -97.822 },
      },
      ip: '151.101.130.217',
    },
    ecs: { version: '1.5.0' },
    event: {
      ingested: new Date(Date.now()).toISOString(),
      outcome: 'unknown',
    },
    http: {
      request: { referrer: '' },
      response: { decoded_body_size: 813, encoded_body_size: 813, transfer_size: 962 },
    },
    observer: {
      ephemeral_id: '863bfb71-dd0d-4033-833f-f9f3d3b71961',
      hostname: 'eb12315912f8',
      id: '23c1bdbb-6a2a-461a-a71f-6338116b5501',
      type: 'apm-server',
      version: '8.0.0',
      version_major: 8,
    },
    processor: { event: 'transaction', name: 'transaction' },
    service: { language: { name: 'javascript' }, name: 'client', version: '1.0.0' },
    source: { ip: '151.101.130.217' },
    timestamp: { us: 1600080193349369 },
    trace: { id: 'd2f9a6f07ea467c68576ee45b97d9aec' },
    transaction: {
      custom: {
        userConfig: { featureFlags: ['double-trouble', '4423-hotfix'], showDashboard: true },
      },
      duration: { us: 72584 },
      id: '8563bad355ff20f7',
      marks: {
        agent: { domComplete: 61, domInteractive: 51, timeToFirstByte: 3 },
        navigationTiming: {
          connectEnd: 1,
          connectStart: 1,
          domComplete: 61,
          domContentLoadedEventEnd: 51,
          domContentLoadedEventStart: 51,
          domInteractive: 51,
          domLoading: 9,
          domainLookupEnd: 1,
          domainLookupStart: 1,
          fetchStart: 0,
          loadEventEnd: 61,
          loadEventStart: 61,
          domInteractive: 51,
          requestStart: 1,
          responseEnd: 4,
          responseStart: 3,
        },
      },
      name: '/products',
      page: { referer: '', url: 'http://opbeans-node:3000/products' },
      sampled: true,
      span_count: { started: 5 },
      type: 'page-load',
    },
    url: {
      domain: 'opbeans-node',
      full: 'http://opbeans-node:3000/products',
      original: 'http://opbeans-node:3000/products',
      path: '/products',
      port: 3000,
      scheme: 'http',
    },
    user: { email: 'arthur.dent@example.com', id: '1', name: 'arthurdent' },
    user_agent: {
      device: { name: 'Other' },
      name: 'Chrome',
      original:
        'Mozilla/5.0 (CrKey armv7l 1.5.16041) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/31.0.1650.0 Safari/537.36',
      os: { name: 'Chromecast' },
      version: '31.0.1650.0',
    },
  };
}

function getPageExitDocument(inpValue: number = 200) {
  const pageLoad = getPageLoadDocument();
  return {
    ...pageLoad,
    transaction: { ...pageLoad.transaction, type: 'page-exit' },
    numeric_labels: { inp_value: inpValue },
  };
}

async function indexInpTestData(esClient: any) {
  const index = 'apm-8.0.0-transaction-000001';

  const { count } = await esClient.count({
    index,
    query: {
      bool: {
        must: [
          { term: { 'transaction.type': 'page-exit' } },
          { exists: { field: 'numeric_labels.inp_value' } },
        ],
      },
    },
  });

  if (count > 0) {
    return;
  }

  const pageLoadDoc = getPageLoadDocument();
  await esClient.index({ index, document: pageLoadDoc });
  for (const inpValue of INP_VALUES) {
    await esClient.index({ index, document: getPageExitDocument(inpValue) });
  }
}
```

---

## UX – tests/core_web_vitals.spec.ts

```typescript
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../fixtures';

test.describe('Core Web Vitals', { tag: tags.stateful.classic }, () => {
  test('displays core web vitals metrics', async ({ pageObjects, page, browserAuth }) => {
    await test.step('Navigate to UX Dashboard', async () => {
      await browserAuth.loginAsViewer();
      await pageObjects.uxDashboard.goto();
      await pageObjects.uxDashboard.waitForLoadingToFinish();
    });

    await test.step('Check Core Web Vitals labels', async () => {
      await expect(page.getByText('Largest contentful paint')).toBeVisible();
      await expect(page.getByText('Interaction to next paint')).toBeVisible();
      await expect(page.getByText('Cumulative layout shift')).toBeVisible();
    });

    await test.step('Check traffic summary', async () => {
      const cwvSummary = page.getByText('of the traffic represented');
      await expect(cwvSummary).toBeVisible();
      await expect(cwvSummary).toHaveText(/[0-9]{1,3}% of the traffic represented/);
    });
  });
});
```

---

## UX – tests/inp.spec.ts

```typescript
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../fixtures';

test.describe('INP', { tag: tags.stateful.classic }, () => {
  test('displays Interaction to Next Paint values', async ({ pageObjects, page, browserAuth }) => {
    await test.step('Navigate to UX Dashboard', async () => {
      await browserAuth.loginAsViewer();
      await pageObjects.uxDashboard.goto({
        percentile: '50',
        rangeFrom: 'now-1y',
        rangeTo: 'now',
      });
      await pageObjects.uxDashboard.waitForLoadingToFinish();
    });

    await test.step('Check INP Values', async () => {
      await expect(page.getByText('Interaction to next paint')).toBeVisible();

      const inpVital = page.testSubj.locator('inp-core-vital');
      await expect(inpVital.locator('.euiTitle')).toBeVisible();
      await expect(page.getByText('381 ms')).toBeVisible();
    });
  });
});
```

---

## UX – tests/page_views.spec.ts

```typescript
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../fixtures';

// This journey was commented out in the original synthetics index.ts but the test code is valid
test.describe('Page Views Chart', { tag: tags.stateful.classic }, () => {
  test('displays page views with browser breakdown', async ({ pageObjects, page, browserAuth }) => {
    await test.step('Navigate to UX Dashboard', async () => {
      await browserAuth.loginAsAdmin();
      await pageObjects.uxDashboard.goto();
      await pageObjects.uxDashboard.waitForLoadingToFinish();
    });

    await test.step('Select browser breakdown', async () => {
      await pageObjects.uxDashboard.waitForChartData();
      await page.testSubj.click('pvBreakdownFilter');
      await page.locator('button[role="option"]:has-text("Browser")').click();
    });

    await test.step('Verify browser breakdown values', async () => {
      await expect(page.getByText('Chrome', { exact: true })).toBeVisible();
      await expect(page.getByText('Chrome Mobile iOS', { exact: true })).toBeVisible();
      await expect(page.getByText('Edge', { exact: true })).toBeVisible();
      await expect(page.getByText('Safari', { exact: true })).toBeVisible();
      await expect(page.getByText('Firefox', { exact: true })).toBeVisible();
    });

    await test.step('Navigate to exploratory view', async () => {
      await page.hover('text=Firefox');
      await pageObjects.uxDashboard.embeddablePanelMenuIcon('.pageViewsChart').click();
      await page.testSubj.click('embeddablePanelAction-expViewExplore');
      await page.waitForURL(/exploratory-view/);
    });

    await test.step('Verify chart in exploratory view', async () => {
      await pageObjects.uxDashboard.waitForChartData();
      await expect(page.getByText('User experience (RUM)')).toBeVisible();
      await expect(page.getByText('Page views')).toBeVisible();
      await expect(page.getByText('Chrome', { exact: true })).toBeVisible();
      await expect(page.getByText('Chrome Mobile iOS', { exact: true })).toBeVisible();
      await expect(page.getByText('Edge', { exact: true })).toBeVisible();
      await expect(page.getByText('Safari', { exact: true })).toBeVisible();
      await expect(page.getByText('Firefox', { exact: true })).toBeVisible();
    });
  });
});
```

---

## UX – tests/ux_client_metrics.spec.ts

```typescript
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../fixtures';

test.describe('UX Client Metrics', { tag: tags.stateful.classic }, () => {
  test('displays client metrics values', async ({ pageObjects, page, browserAuth }) => {
    await test.step('Navigate to UX Dashboard', async () => {
      await browserAuth.loginAsViewer();
      await pageObjects.uxDashboard.goto();
      await pageObjects.uxDashboard.waitForLoadingToFinish();
    });

    await test.step('Confirm metrics values', async () => {
      await pageObjects.uxDashboard.waitForChartData();
      await expect(page.testSubj.locator('uxClientMetrics-totalPageLoad')).toContainText('Total');
      await expect(page.testSubj.locator('uxClientMetrics-totalPageLoad')).toContainText('4.24 s');

      await expect(page.testSubj.locator('uxClientMetrics-backend')).toContainText('Backend');
      await expect(page.testSubj.locator('uxClientMetrics-backend')).toContainText('359 ms');

      await expect(page.testSubj.locator('uxClientMetrics-frontend')).toContainText('Frontend');
      await expect(page.testSubj.locator('uxClientMetrics-frontend')).toContainText('3.88 s');

      await expect(page.testSubj.locator('uxClientMetrics-pageViews')).toContainText(
        'Total page views'
      );
      await expect(page.testSubj.locator('uxClientMetrics-pageViews')).toContainText('524');
    });
  });
});
```

---

## UX – tests/ux_js_errors.spec.ts

```typescript
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../fixtures';

test.describe('UX JS Errors', { tag: tags.stateful.classic }, () => {
  test('displays JS error count', async ({ pageObjects, page, browserAuth }) => {
    await test.step('Navigate to UX Dashboard', async () => {
      await browserAuth.loginAsViewer();
      await pageObjects.uxDashboard.goto();
      await pageObjects.uxDashboard.waitForLoadingToFinish();
    });

    await test.step('Confirm error count', async () => {
      const jsErrorsPlaceholder = page.locator('[aria-label="JavaScript errors"]');
      await jsErrorsPlaceholder.scrollIntoViewIfNeeded();
      await pageObjects.uxDashboard.waitForChartData();

      const jsErrorsTotal = page.testSubj.locator('uxJsErrorsTotal');
      await expect(jsErrorsTotal).toContainText('Total errors');
      await expect(jsErrorsTotal).toContainText('3 k');
    });
  });
});
```

---

## UX – tests/ux_long_task_metrics.spec.ts

```typescript
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../fixtures';

test.describe('UX Long Task Metrics', { tag: tags.stateful.classic }, () => {
  test('displays long task metrics values', async ({ pageObjects, page, browserAuth }) => {
    await test.step('Navigate to UX Dashboard', async () => {
      await browserAuth.loginAsViewer();
      await pageObjects.uxDashboard.goto();
      await pageObjects.uxDashboard.waitForLoadingToFinish();
    });

    await test.step('Confirm long task metrics values', async () => {
      await pageObjects.uxDashboard.waitForChartData();
      const longestTask = page.testSubj.locator('uxLongestTask');
      await expect(longestTask).toContainText('Longest long task duration');
      await expect(longestTask).toContainText('237 ms');

      const longTaskCount = page.testSubj.locator('uxLongTaskCount');
      await expect(longTaskCount).toContainText('No. of long tasks');
      await expect(longTaskCount).toContainText('3');

      const sumLongTask = page.testSubj.locator('uxSumLongTask');
      await expect(sumLongTask).toContainText('Total long tasks duration');
      await expect(sumLongTask).toContainText('428 ms');
    });
  });
});
```

---

## UX – tests/ux_url_query.spec.ts

```typescript
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test, testData } from '../fixtures';

test.describe('UX URL Query', { tag: tags.stateful.classic }, () => {
  test('confirms query params are applied', async ({ pageObjects, page, browserAuth }) => {
    await test.step('Navigate to UX Dashboard', async () => {
      await browserAuth.loginAsViewer();
      await pageObjects.uxDashboard.goto();
      await pageObjects.uxDashboard.waitForLoadingToFinish();
    });

    await test.step('Confirm percentile query param', async () => {
      const percentileSelect = page.testSubj.locator('uxPercentileSelect');
      await expect(percentileSelect).toHaveValue(testData.DEFAULT_QUERY_PARAMS.percentile);
    });
  });
});
```

---

## UX – tests/ux_visitor_breakdown.spec.ts

```typescript
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../fixtures';

const OS_NAME_CHART_ID = 'ux-visitor-breakdown-user_agent-os-name';
const UA_NAME_CHART_ID = 'ux-visitor-breakdown-user_agent-name';

test.describe('UX Visitor Breakdown', { tag: tags.stateful.classic }, () => {
  test('displays visitor breakdown charts', async ({ pageObjects, page, browserAuth }) => {
    await test.step('Navigate to UX Dashboard', async () => {
      await browserAuth.loginAsAdmin();
      await pageObjects.uxDashboard.goto();
      await pageObjects.uxDashboard.waitForLoadingToFinish();
    });

    await test.step('Confirm visitor breakdown charts are visible', async () => {
      const visitorBreakdownPlaceholder = page.locator(
        '[aria-label="Page load duration by region (avg.)"]'
      );
      await visitorBreakdownPlaceholder.scrollIntoViewIfNeeded();
      await pageObjects.uxDashboard.waitForChartData();
      await pageObjects.uxDashboard.waitForLoadingToFinish();

      await expect(pageObjects.uxDashboard.lensEmbeddableLocator(OS_NAME_CHART_ID)).toBeVisible();
      await expect(pageObjects.uxDashboard.lensEmbeddableLocator(UA_NAME_CHART_ID)).toBeVisible();
    });
  });
});
```

---

## UX – tsconfig.json (plugin-level, migrate branch)

The UX plugin's main `tsconfig.json` includes Scout tests and references `@kbn/scout-oblt`:

```json
{
  "extends": "@kbn/tsconfig-base/tsconfig.json",
  "compilerOptions": {
    "outDir": "target/types"
  },
  "include": [
    "../../../../../typings/**/*",
    "common/**/*",
    "public/**/*",
    "server/**/*",
    "typings/**/*",
    "public/**/*.json",
    "test/scout/**/*"
  ],
  "kbn_references": [
    "@kbn/core",
    ...
    "@kbn/scout-oblt",
  ],
  "exclude": ["target/**/*"]
}
```

---

## Migration Pattern Summary

1. **playwright.config.ts**: Use `createPlaywrightConfig` from `@kbn/scout-oblt` with `testDir: './tests'` and `runGlobalSetup: true`.
2. **fixtures/index.ts**: Extend `baseTest` with plugin-specific page objects via `createLazyPageObject`, and re-export `testData` from `constants.ts`.
3. **fixtures/constants.ts**: Define `ES_ARCHIVES` paths and any shared test data.
4. **fixtures/page_objects/**: Class-based page objects taking `ScoutPage` (and optionally `KibanaUrl`), using `page.testSubj` and `page.gotoApp()`.
5. **tests/global.setup.ts**: Use `globalSetupHook` with `tags.stateful.classic` to load ES archives and run any extra setup (e.g. `indexInpTestData`).
6. **tests/*.spec.ts**: Use `test` and `expect` from fixtures/`@kbn/scout-oblt`, `browserAuth.loginAsAdmin()` / `loginAsViewer()`, and tags like `@local-stateful-classic` or `tags.stateful.classic`.
7. **API cleanup**: Use `test.afterAll` with `apiServices.ml.deleteJobs` or similar for cleanup.
8. **Dynamic data**: Use helpers such as `makeChecksWithStatus` with `esClient` in `test.beforeAll` when you need custom ES data.
