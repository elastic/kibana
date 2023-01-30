/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ISavedObjectTypeRegistry } from '@kbn/core-saved-objects-server';
import { getMigrationHash } from '@kbn/core-test-helpers-so-type-serializer';
import { Root } from '@kbn/core-root-server-internal';
import {
  createTestServers,
  createRootWithCorePlugins,
  type TestElasticsearchUtils,
} from '@kbn/core-test-helpers-kbn-server';

describe('checking migration metadata changes on all registered SO types', () => {
  let esServer: TestElasticsearchUtils;
  let root: Root;
  let typeRegistry: ISavedObjectTypeRegistry;

  beforeAll(async () => {
    const { startES } = createTestServers({
      adjustTimeout: (t: number) => jest.setTimeout(t),
    });

    esServer = await startES();
    root = createRootWithCorePlugins({}, { oss: false });
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
        "action": "7858e6d5a9f231bf23f6f2e57328eb0095b26735",
        "action_task_params": "bbd38cbfd74bf6713586fe078e3fa92db2234299",
        "alert": "f2e81863be0b50966b876b88b906c962e30b8c9c",
        "api_key_pending_invalidation": "9b4bc1235337da9a87ef05a1d1f4858b2a3b77c6",
        "apm-indices": "ceb0870f3a74e2ffc3a1cd3a3c73af76baca0999",
        "apm-server-schema": "2bfd2998d3873872e1366458ce553def85418f91",
        "apm-service-group": "07ecbf25ee4828d2b686abc98656b6665831d1a0",
        "apm-telemetry": "abaa1e9469e6e0bad76938309f0ac4c66b528d58",
        "app_search_telemetry": "7fc4fc08852bf0924ee29942bb394fda9aa8954d",
        "application_usage_daily": "6e645e0b60ef3af2e8fde80963c2a4f09a190d61",
        "application_usage_totals": "b2af3577dcd50bfae492b166a7804f69e2cc41dc",
        "canvas-element": "e2e312fc499c1a81e628b88baba492fb24f4e82d",
        "canvas-workpad": "4b05f7829bc805bbaa07eb9fc0d2a2bbbd6bbf39",
        "canvas-workpad-template": "d4bb65aa9c4a2b25029d3272fd9c715d8e4247d7",
        "cases": "a27d57e75e358349a6ba835152fd4de0033a7bff",
        "cases-comments": "d7c4c1d24e97620cd415e27e5eb7d5b5f2c5b461",
        "cases-configure": "1afc414f5563a36e4612fa269193d3ed7277c7bd",
        "cases-connector-mappings": "4b16d440af966e5d6e0fa33368bfa15d987a4b69",
        "cases-telemetry": "16e261e7378a72acd0806f18df92525dd1da4f37",
        "cases-user-actions": "f1b0dcfeb58a65e68b35c5e99ddee70e746a06c7",
        "config": "e3f0408976dbdd453641f5699927b28b188f6b8c",
        "config-global": "b8f559884931609a349e129c717af73d23e7bc76",
        "connector_token": "fa5301aa5a2914795d3b1b82d0a49939444009da",
        "core-usage-stats": "f40a213da2c597b0de94e364a4326a5a1baa4ca9",
        "csp-rule-template": "d6104585d0b032355c64a7dbf2a834163351cb1c",
        "dashboard": "7e37790f802b39c852f905c010e13674e893105a",
        "endpoint:user-artifact": "f94c250a52b30d0a2d32635f8b4c5bdabd1e25c0",
        "endpoint:user-artifact-manifest": "8c14d49a385d5d1307d956aa743ec78de0b2be88",
        "enterprise_search_telemetry": "fafcc8318528d34f721c42d1270787c52565bad5",
        "epm-packages": "21e096cf4554abe1652953a6cd2119d68ddc9403",
        "epm-packages-assets": "9fd3d6726ac77369249e9a973902c2cd615fc771",
        "event_loop_delays_daily": "d2ed39cf669577d90921c176499908b4943fb7bd",
        "exception-list": "fe8cc004fd2742177cdb9300f4a67689463faf9c",
        "exception-list-agnostic": "49fae8fcd1967cc4be45ba2a2c66c4afbc1e341b",
        "file": "f5d393602a4c103eb0ace983e6810f7f3666544b",
        "file-upload-usage-collection-telemetry": "8478924cf0057bd90df737155b364f98d05420a5",
        "fileShare": "3f88784b041bb8728a7f40763a08981828799a75",
        "fleet-fleet-server-host": "643d15dbf56edb96f7ca65f98409d83ac5792fb6",
        "fleet-preconfiguration-deletion-record": "7b28f200513c28ae774f1b7d7d7906954e3c6e16",
        "fleet-proxy": "2bbcd9e6d5e30ac07b275c8d489af07a0d550df5",
        "graph-workspace": "3342f2cd561afdde8f42f5fb284bf550dee8ebb5",
        "guided-onboarding-guide-state": "561db8d481b131a2bbf46b1e534d6ce960255135",
        "guided-onboarding-plugin-state": "a802ed58e9d0076b9632c59d7943861ba476f99c",
        "index-pattern": "48e77ca393c254e93256f11a7cdc0232dd754c08",
        "infrastructure-monitoring-log-view": "e2c78c1076bd35e57d7c5fa1b410e5c126d12327",
        "infrastructure-ui-source": "7c8dbbc0a608911f1b683a944f4a65383f6153ed",
        "ingest-agent-policies": "54d586fdafae83ba326e47d1a3727b0d9c910a12",
        "ingest-download-sources": "1e69dabd6db5e320fe08c5bda8f35f29bafc6b54",
        "ingest-outputs": "29181ecfdc7723f544325ecef7266bccbc691a54",
        "ingest-package-policies": "d93048bf153f9043946e8965065a88014f7ccb41",
        "ingest_manager_settings": "6f36714825cc15ea8d7cda06fde7851611a532b4",
        "inventory-view": "bc2bd1e7ec7c186159447ab228d269f22bd39056",
        "kql-telemetry": "29544cd7d3b767c5399878efae6bd724d24c03fd",
        "legacy-url-alias": "7172dfd54f2e0c89fe263fd7095519b2d826a930",
        "lens": "236ecd358ed3a4ecfc03ed676d958b64acf0b697",
        "lens-ui-telemetry": "df2844565c9e18fed2bdb1f6cc3aadd58cf1e45b",
        "map": "00ca6c4cf46ae59f70f1436262eb9f457b45eb14",
        "maps-telemetry": "5adbde35bd50ec2b8e9ea5b96d4d9f886e31ecfb",
        "metrics-explorer-view": "09e56993352b8ee678e88f71e4410d9aeee72f3a",
        "ml-job": "2836da98a81bd220db61c0549e8e28da7a876cb2",
        "ml-module": "95055522c8406afa67a554690a43506f6c040744",
        "ml-trained-model": "e39dd10b2da827e194ddcaaf3db141ad1daf0201",
        "monitoring-telemetry": "af508cea8e22edaa909e462069390650fbbf01b7",
        "osquery-manager-usage-metric": "fbe3cbea25a96e2ca522ca436878e0162c94dcc2",
        "osquery-pack": "a2d675c7af4208e54a5b28d23d324d7c599a5491",
        "osquery-pack-asset": "de8783298eb33a577bf1fa0caacd42121dcfae91",
        "osquery-saved-query": "7b213b4b7a3e59350e99c50e8df9948662ed493a",
        "query": "4640ef356321500a678869f24117b7091a911cb6",
        "rules-settings": "1af4c9abd4b40a154e233c2af4867df7aab7ac24",
        "sample-data-telemetry": "8b10336d9efae6f3d5593c4cc89fb4abcdf84e04",
        "search": "c48f5ab5d94545780ea98de1bff9e39f17f3606b",
        "search-session": "ba383309da68a15be3765977f7a44c84f0ec7964",
        "search-telemetry": "beb3fc25488c753f2a6dcff1845d667558712b66",
        "security-rule": "e0dfdba5d66139d0300723b2e6672993cd4a11f3",
        "security-solution-signals-migration": "e65933e32926e0ca385415bd44fc6da0b6d3d419",
        "siem-detection-engine-rule-actions": "d4b5934c0c0e4ccdf509a41000eb0bee07be0c28",
        "siem-detection-engine-rule-execution-info": "b92d51db7b7d591758d3e85892a91064aff01ff8",
        "siem-ui-timeline": "95474f10662802e2f9ea068b45bf69212a2f5842",
        "siem-ui-timeline-note": "08c71dc0b8b8018a67e80beb4659a078404c223d",
        "siem-ui-timeline-pinned-event": "e2697b38751506c7fce6e8b7207a830483dc4283",
        "space": "c4a0acce1bd4b9cce85154f2a350624a53111c59",
        "spaces-usage-stats": "922d3235bbf519e3fb3b260e27248b1df8249b79",
        "synthetics-monitor": "7c1e5a78fb3b88cc03b441d3bf3714d9967ab214",
        "synthetics-param": "53dee203042c238888247084336f2dba777f4a65",
        "synthetics-privates-locations": "dd00385f4a27ef062c3e57312eeb3799872fa4af",
        "tag": "39413f4578cc2128c9a0fda97d0acd1c8862c47a",
        "task": "ef53d0f070bd54957b8fe22fae3b1ff208913f76",
        "telemetry": "9142dc5f18123fb6e6a9083db04e5becbfde94fd",
        "ui-metric": "2fb66ccdee2d1fad52547964421629c5a485c38f",
        "upgrade-assistant-ml-upgrade-operation": "408120d386c04ab25fe64a03937597aa0438c10d",
        "upgrade-assistant-reindex-operation": "d9e18b3d9578ecabf09a297296dcf7e36b2481fd",
        "upgrade-assistant-telemetry": "a0c80933a9f8b50a2590d19e1d1e5f97d28f7104",
        "uptime-dynamic-settings": "9de35c5aeaef915c5bc3c5b1632c33fb0f6f1c55",
        "uptime-synthetics-api-key": "df9d8418ddc210d832a069a0fb796f73e63d1082",
        "url": "d66c1f26ed23a392be3617a8444d713571f58380",
        "usage-counters": "33e2081a52215293041da1100e6602fb553ff446",
        "visualization": "f45d06858a5634c9ed0367e11eb44f7f7dde0be2",
        "workplace_search_telemetry": "45bd03e12b060c08381b0fd325d939f80d08c914",
      }
    `);
  });
});
