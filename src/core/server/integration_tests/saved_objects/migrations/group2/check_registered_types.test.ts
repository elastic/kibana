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
        "action": "12c6b25ef1fffb36d8de893318f8a2bc5d6a46a6",
        "action_task_params": "c725c37de66135934150465f9b1e76fe349e8a23",
        "alert": "0cd1f1921014004a9ff5c0a9333ca9bde14bf748",
        "api_key_pending_invalidation": "16e7bcf8e78764102d7f525542d5b616809a21ee",
        "apm-indices": "d19dd7fb51f2d2cbc1f8769481721e0953f9a6d2",
        "apm-server-schema": "1d42f17eff9ec6c16d3a9324d9539e2d123d0a9a",
        "apm-service-group": "2801c50332e3bf5726c923966c1f19f886e7d389",
        "apm-telemetry": "712138c3d5e36d865e67c7fc0171c8a779446e58",
        "app_search_telemetry": "9269643c9a5894998b44883f7f7d07a453fd6a95",
        "application_usage_daily": "9867f6e1355124f822beab051e0fbac4cc117eac",
        "application_usage_totals": "9469a48ab887761a73ee3719b8d401ac627f1eb1",
        "canvas-element": "ec334dd45d14291db4d74197e0e42dfe06526868",
        "canvas-workpad": "ab0525bd5aa4dbad2d6fdb30e6a51bb475254751",
        "canvas-workpad-template": "c54f2a188a1d0bf18a6cebd9d6f28a7337d41bbf",
        "cases": "1e86563e8364c69f86b77cb6f2933408dd5b827a",
        "cases-comments": "69257ec55e8380fdb2ecbddc83e7c26d2ce2a351",
        "cases-configure": "66d4c64d83b464f5166005b8ffa03b721fcaaf8b",
        "cases-connector-mappings": "877bb4d52e9821e330622bd75fba799490ec6952",
        "cases-telemetry": "fdeddcef28c75d8c66422475a829e75d37f0b668",
        "cases-user-actions": "8ad74294b71edffa58fad7a40eea2388209477c9",
        "config": "97e16b8f5dc10c404fd3b201ef36bc6c3c63dc80",
        "config-global": "d9791e8f73edee884630e1cb6e4954ae513ce75e",
        "connector_token": "aff1aa0ebc0a6b44b570057972af25178b0bca42",
        "core-usage-stats": "b3c04da317c957741ebcdedfea4524049fdc79ff",
        "csp-rule-template": "099c229bf97578d9ca72b3a672d397559b84ee0b",
        "dashboard": "71e3f8dfcffeb5fbd410dec81ce46f5691763c43",
        "endpoint:user-artifact-manifest": "8ad9bd235dcfdc18b567aef0dc36ac686193dc89",
        "enterprise_search_telemetry": "4b41830e3b28a16eb92dee0736b44ae6276ced9b",
        "epm-packages": "8755f947a00613f994b1bc5d5580e104043e27f6",
        "epm-packages-assets": "00c8b5e5bf059627ffc9fbde920e1ac75926c5f6",
        "event_loop_delays_daily": "ef49e7f15649b551b458c7ea170f3ed17f89abd0",
        "exception-list": "38181294f64fc406c15f20d85ca306c8a4feb3c0",
        "exception-list-agnostic": "d527ce9d12b134cb163150057b87529043a8ec77",
        "file": "d12998f49bc82da596a9e6c8397999930187ec6a",
        "file-upload-usage-collection-telemetry": "c6fcb9a7efcf19b2bb66ca6e005bfee8961f6073",
        "fileShare": "f07d346acbb724eacf139a0fb781c38dc5280115",
        "fleet-fleet-server-host": "67180a54a689111fb46403c3603c9b3a329c698d",
        "fleet-message-signing-keys": "0c6da6a680807e568540b2aa263ae52331ba66db",
        "fleet-preconfiguration-deletion-record": "3afad160748b430427086985a3445fd8697566d5",
        "fleet-proxy": "94d0a902a0fd22578d7d3a20873b95d902e25245",
        "graph-workspace": "565642a208fe7413b487aea979b5b153e4e74abe",
        "guided-onboarding-guide-state": "3257825ae840309cb676d64b347107db7b76f30a",
        "guided-onboarding-plugin-state": "2d3ef3069ca8e981cafe8647c0c4a4c20739db10",
        "index-pattern": "cd51191712081278c2af83d16552c3438ef83353",
        "infrastructure-monitoring-log-view": "8040108f02ef27419cff79077384379709d44bbc",
        "infrastructure-ui-source": "2311f7d0abe2a713aa71e30ee24f78828d4acfc1",
        "ingest-agent-policies": "e5bb18f8c1d1106139e82fccb93fce01b21fde9b",
        "ingest-download-sources": "95a15b6589ef46e75aca8f7e534c493f99cc3ccd",
        "ingest-outputs": "f5adeb3f6abc732a6067137e170578dbf1f58c62",
        "ingest-package-policies": "6dc1c9b80a8dc95fbc9c6d9b73dfc56a098eb440",
        "ingest_manager_settings": "fb75bff08a8de3435b23664b1191f9244a255701",
        "inventory-view": "6d47ef0b38166ecbd1c2fc7394599a4500db1ae4",
        "kql-telemetry": "92d6357aa3ce28727492f86a54783f802dc38893",
        "legacy-url-alias": "9b8cca3fbb2da46fd12823d3cd38fdf1c9f24bc8",
        "lens": "2f6a8231591e3d62a83506b19e165774d74588ea",
        "lens-ui-telemetry": "d6c4e330d170eefc6214dbf77a53de913fa3eebc",
        "maintenance-window": "a9777f4e71381c56b4422bf8d30f626bde301c79",
        "map": "7902b2e2a550e0b73fd5aa6c4e2ba3a4e6558877",
        "metrics-explorer-view": "713dbf1ab5e067791d19170f715eb82cf07ebbcc",
        "ml-job": "12e21f1b1adfcc1052dc0b10c7459de875653b94",
        "ml-module": "c88b6a012cfb7b7adb7629b1edeab6b83f1fd048",
        "ml-trained-model": "49a1685d79990ad05ea1d1d30e28456fe002f3b9",
        "monitoring-telemetry": "24f7393dfacb6c7b0f7ad7d242171a1c29feaa48",
        "osquery-manager-usage-metric": "23a8f08a98dd0f58ab4e559daa35b06edc40ed4f",
        "osquery-pack": "edd84b2c59ef36214ece0676706da8f22175c660",
        "osquery-pack-asset": "18e08979d46ee7e5538f54c080aec4d8c58516ca",
        "osquery-saved-query": "f5e4e303f65c7607248ea8b2672f1ee30e4fb15e",
        "query": "cfc049e1f0574fb4fdb2d653d7c10bdc970a2610",
        "rules-settings": "eb8d40b7d60aeffe66831f7d5d83de28d85776d8",
        "sample-data-telemetry": "c38daf1a49ed24f2a4fb091e6e1e833fccf19935",
        "search": "ed3a9b1681b57d69560909d51933fdf17576ea68",
        "search-session": "fae0dfc63274d6a3b90ca583802c48cab8760637",
        "search-telemetry": "1bbaf2db531b97fa04399440fa52d46e86d54dd8",
        "security-rule": "151108f4906744a137ddc89f5988310c5b9ba8b6",
        "security-solution-signals-migration": "0be3bed0f2ff4fe460493751b8be610a785c5c98",
        "siem-detection-engine-rule-actions": "123c130dc38120a470d8db9fed9a4cebd2046445",
        "siem-ui-timeline": "e9d6b3a9fd7af6dc502293c21cbdb309409f3996",
        "siem-ui-timeline-note": "13c9d4c142f96624a93a623c6d7cba7e1ae9b5a6",
        "siem-ui-timeline-pinned-event": "96a43d59b9e2fc11f12255a0cb47ef0a3d83af4c",
        "slo": "aefffabdb35d15a6c388634af2cee1fa59ede83c",
        "space": "168a35eab6fc40eceacc4731c8b8d8af114e27c4",
        "spaces-usage-stats": "084bd0f080f94fb5735d7f3cf12f13ec92f36bad",
        "synthetics-monitor": "fa988678e5d6791c75515fa1acdbbb3b2d1f916d",
        "synthetics-param": "9776c9b571d35f0d0397e8915e035ea1dc026db7",
        "synthetics-privates-locations": "7d032fc788905e32152029ae7ab3d6038c48ae44",
        "tag": "87f21f07df9cc37001b15a26e413c18f50d1fbfe",
        "task": "533ee80c50c47f0505846bfac73fc10962c5bc45",
        "telemetry": "3b3b89cf411a2a2e60487cef6ccdbc5df691aeb9",
        "ui-metric": "410a8ad28e0f44b161c960ff0ce950c712b17c52",
        "upgrade-assistant-ml-upgrade-operation": "d8816e5ce32649e7a3a43e2c406c632319ff84bb",
        "upgrade-assistant-reindex-operation": "09ac8ed9c9acf7e8ece8eafe47d7019ea1472144",
        "uptime-dynamic-settings": "9a63ce80904a04be114749e426882dc3ff011137",
        "uptime-synthetics-api-key": "599319bedbfa287e8761e1ba49d536417a33fa13",
        "url": "816fa15bfe460ce39108ed8095e60fdbfcc40f11",
        "usage-counters": "f478b2668be350f5bdc08d9e1cf6fbce0e079f61",
        "visualization": "55530e57ffe86bfd7c2a2b50461398c1f7a99e95",
        "workplace_search_telemetry": "10e278fe9ae1396bfc36ae574bc387d7e696d43f",
      }
    `);
  });
});
