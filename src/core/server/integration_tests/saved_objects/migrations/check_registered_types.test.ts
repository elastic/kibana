/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ISavedObjectTypeRegistry } from '@kbn/core-saved-objects-server';
import { getMigrationHash } from '@kbn/core-test-helpers-so-type-serializer';
import { Root } from '../../../root';
import * as kbnTestServer from '../../../../test_helpers/kbn_server';

describe('checking migration metadata changes on all registered SO types', () => {
  let esServer: kbnTestServer.TestElasticsearchUtils;
  let root: Root;
  let typeRegistry: ISavedObjectTypeRegistry;

  beforeAll(async () => {
    const { startES } = kbnTestServer.createTestServers({
      adjustTimeout: (t: number) => jest.setTimeout(t),
    });

    esServer = await startES();
    root = kbnTestServer.createRootWithCorePlugins({}, { oss: false });
    await root.preboot();
    await root.setup();
    const coreStart = await root.start();
    typeRegistry = coreStart.savedObjects.getTypeRegistry();
  });

  afterAll(async () => {
    if (root) {
      await root.shutdown();
    }
    if (esServer) {
      await esServer.stop();
    }
  });

  // This test is meant to fail when any change is made in registered types that could potentially impact the SO migration.
  // Just update the snapshot by running this test file via jest_integration with `-u` and push the update.
  // The intent is to trigger a code review from the Core team to review the SO type changes.
  it('detecting migration related changes in registered types', () => {
    const allTypes = typeRegistry.getAllTypes();

    const hashMap = allTypes.reduce((map, type) => {
      map[type.name] = getMigrationHash(type);
      return map;
    }, {} as Record<string, string>);

    expect(hashMap).toMatchInlineSnapshot(`
      Object {
        "action": "670d6a054f724331148a923be76f11903425e0ad",
        "action_task_params": "6fc99753f3aa1eadc912e5a08574700906f57eca",
        "alert": "66dadb611877a195c37042304fa10e855a2c4a20",
        "api_key_pending_invalidation": "625df02c2fabb3d71baa59ac8d0b410e0ee4ecf7",
        "apm-indices": "72ffc9d9fd0f3337a2698c5d81babd458f291c41",
        "apm-server-schema": "a6e08271a3a77343c48856d53b65cd9a4412dce5",
        "apm-service-group": "37c017fad6bceadc13699e6a3c96434bea37c456",
        "apm-telemetry": "6105628d5b59433632b2adc59a60df16aad56ede",
        "app_search_telemetry": "96f9eb35cdde1cebfb4a6ccfd481a64205c7c763",
        "application_usage_daily": "19ec2719d9934a619cd4dfbf412ba83c91dc05f5",
        "application_usage_totals": "93bdfb1d066c594727b9eb3de6c0534888a0dca1",
        "canvas-element": "2c81e7cebfa98277dac8198eb2eb8297153369a5",
        "canvas-workpad": "2aacbc61919edb91666607c807a6cc6f653aff54",
        "canvas-workpad-template": "7a6e3a584f9a43ccc775a2b50329b2a84cb66bd5",
        "cases": "c3ad470c0ce075422099baa3d66de8e5c9ff1e41",
        "cases-comments": "093ba0eee542d335f277e5eb57b7669df21bedff",
        "cases-configure": "8d9716a796b47ce7b14f83c846e81f0d8639f16f",
        "cases-connector-mappings": "1e0b4dea1f0328091ee0905ed03e0dca9473ac53",
        "cases-telemetry": "f5f8022a7b357475b50417a38f54d44a19519a12",
        "cases-user-actions": "c70a8657d5d10e3a7e5c245ce418a79444762b76",
        "config": "c085567de2796eb17e74d3ac5b273e7b55b036ea",
        "connector_token": "8b260275ec6948cd5b3f4295d26b7ccae3c17f7b",
        "core-usage-stats": "bb8d2933240c4a197d073f084daf006e9915ecb1",
        "csp-rule-template": "0fc48ae098be48be8498ae05b593bdaee71528d8",
        "csp_rule": "27647c9b5e16d2ae631d539c6bc54825ce9807a0",
        "dashboard": "6e7d206e27e64298aa80aa84139e5d4952e11200",
        "endpoint:user-artifact": "a0446a647de9e5726b52bd302a650b7cc4347f20",
        "endpoint:user-artifact-manifest": "b564052b2ad1757c513b488716363b1839c485db",
        "enterprise_search_telemetry": "a8e4bbe54c5a1f3831e165067009cb590dbc188e",
        "epm-packages": "52a4e14a175f11f19cb2152ec75e2d9aa22cc675",
        "epm-packages-assets": "93354f140fb4558593a598981dfc4964bfb8b8b8",
        "event_loop_delays_daily": "717aa91bf3ab596112380145230c37a75a2cb283",
        "exception-list": "2a6e167d225dc8e5f2ddbe49096a87a5d50ba6b7",
        "exception-list-agnostic": "6a1c300679558fe54c69a3ac2386d4fac921b0cb",
        "file": "0c8dca434f4fcf425619fafc9fe18d281dd356c6",
        "file-upload-usage-collection-telemetry": "4937ba8a7077cbb3c462f92def5b890e9b9a2d30",
        "fileShare": "70eb5b4efd1e205be074c7157c1c15d4b69f54d1",
        "fleet-preconfiguration-deletion-record": "252edd2d7319e113d86201d6162d7c16fdb57662",
        "graph-workspace": "9c5ca132e9f86e5061ec2c7c15e63f482203eca3",
        "guided-setup-state": "688c745c38f178b998e4a6447413387e71a37811",
        "index-pattern": "9e81ebfa7bedd93da13c697cef286c52e8946b9c",
        "infrastructure-monitoring-log-view": "c27ba90abd1de301c9e7c79105dc671e3095e808",
        "infrastructure-ui-source": "36683b966798864fd99914dab80c7aafe5304b89",
        "ingest-agent-policies": "f04142f7d7f3c100b21234c36a669587a7aafd01",
        "ingest-download-sources": "756df6a414222d3ac7b551c54c9265c9a73d611a",
        "ingest-outputs": "92932a05bccc48ad77712490777fe67010afbd39",
        "ingest-package-policies": "99074dc08fb049eec5cf3385b20b18982f4a1372",
        "ingest_manager_settings": "4676b941452d815d1316d8fea66764b04e2dd82d",
        "inventory-view": "0431ee739cbac68ee43e972bde46233aeab4509d",
        "kql-telemetry": "a45055ecc5da88113e8035b0da0a1b3d204f7831",
        "legacy-url-alias": "c20839f66d610e644f532cc1d0065b3aead8b707",
        "lens": "3fcd2c68db38d125ba098e6961d7061043e5e15b",
        "lens-ui-telemetry": "a7d885a9d4ed9e6228e9655bf349683302d3091c",
        "map": "3b645ff196897ccb4ee7ac87ef47ec6149543d8b",
        "maps-telemetry": "de2261f2d16efc52a8060c0e005af330f93d0ad5",
        "metrics-explorer-view": "4483b1217927069d1b754cb47a2b2a0b7fab71c0",
        "ml-job": "55683307d2440dc2b37a65f8083f5fe118efc708",
        "ml-module": "4027e14ad9e1d8ac338af944303b609e88f9373c",
        "ml-trained-model": "225cc4601092178c3b8c39a99d2e1c0635495252",
        "monitoring-telemetry": "7db52b2fcfb5313c7973bfbb5757fdecb679321c",
        "osquery-manager-usage-metric": "f5d3a6f3bfdcf7c70305b0298b6864ba236becea",
        "osquery-pack": "ece6866396ce28be3fb400bf856a456c6f94e34a",
        "osquery-pack-asset": "abb7b1b3e437e3348679da29489f9cb4dd3fe661",
        "osquery-saved-query": "617b6ab683849fb586a0a10ac59789dbc7e6bd17",
        "query": "7256fc67f5dedb9c2c4789f6282520626ae3f8f9",
        "sample-data-telemetry": "b0166f3bb393ee2b125e6ea31cfa703534eca0f4",
        "search": "bc08cd0762f1eceb8304b7e8b55842f7b73799db",
        "search-session": "1b00c33e2f2ba7239bb251e93bc2eecd4f3f9368",
        "search-telemetry": "6a5054b5d1d3fec655439129cdcf41ee8773c36f",
        "security-rule": "49007f2d9add442e3abdfd4bfbdb4b8ee906794f",
        "security-solution-signals-migration": "457b3a92637bbff5025702e3664d50092e7acdf7",
        "siem-detection-engine-rule-actions": "2b02fd7a131e8c9a93fd2d2dcd9c2bff1c96ee79",
        "siem-detection-engine-rule-execution-info": "e84ff0b9ac3a3eb62472a2a98ade3eb1d1942cb3",
        "siem-ui-timeline": "f2983d174b81b4048f99909ef4ecd1e1cbd839fa",
        "siem-ui-timeline-note": "e0163c26e1c5313fa26a16b9fff2d77cdd2b9bb7",
        "siem-ui-timeline-pinned-event": "03aecb7443058959e9566e868702f2093abe09a6",
        "space": "859b5e774e777a67914fe4cd44305d1e9c5cfee9",
        "spaces-usage-stats": "0a0e4f0d05856d66f1d066029a9806a775c48aa9",
        "synthetics-monitor": "cd981711de6dda0ed10f4de461bfbf7dcdbece2f",
        "synthetics-privates-locations": "5e4a8e7b8b89a797c2d89afed7c324825df4379d",
        "tag": "350d3e346b387878d34344168ed82ffb48ad9e4a",
        "task": "81f3742773e354f9b75aeec4ec17df7c40459f4a",
        "telemetry": "854cb7b893d957c50a983cce8667a9c69741f035",
        "ui-metric": "f68facf07a90f6f3bd45711cae941f2ccfe57822",
        "upgrade-assistant-ml-upgrade-operation": "5cb1b616139663c067eaabded8c02ca1847c7e56",
        "upgrade-assistant-reindex-operation": "813d30ae1be7693d130a4b074c03d3d3d87f56e1",
        "upgrade-assistant-telemetry": "769005514e1fe748e0573c1e90a8d7467d8b809e",
        "uptime-dynamic-settings": "5d41fa3835d74845f5b3a3549abf57e2701a53fd",
        "uptime-synthetics-api-key": "1986f2ae47d97fbc486acb647ba9b0bcc60b8f50",
        "url": "01ef7eb95164489ec9593ae563b980d555990c00",
        "usage-counters": "6e5ad33da6d79670148aae778148ecbef48de9d6",
        "visualization": "b24ecea4feec126087282391cf6113ce7e0b600d",
        "workplace_search_telemetry": "613e138621bdce016c8442148c7a989cfdeba3bf",
      }
    `);
  });
});
