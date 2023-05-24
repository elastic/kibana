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
        "action": "cc93fe2c0c76e57c2568c63170e05daea897c136",
        "action_task_params": "96e27e7f4e8273ffcd87060221e2b75e81912dd5",
        "alert": "dc710bc17dfc98a9a703d388569abccce5f8bf07",
        "api_key_pending_invalidation": "1399e87ca37b3d3a65d269c924eda70726cfe886",
        "apm-indices": "9b550bac232e057ec25585e5cb0b5fa08b88f7dc",
        "apm-server-schema": "0012e7afc8dcaf7e0180443a3f105ed461c610a2",
        "apm-service-group": "ef3128df3fc95612f141198ae9ef922b5cb6cd04",
        "apm-telemetry": "ff679c0ecceff161fd16189150dca256d0904055",
        "app_search_telemetry": "36234f19573ad397ac30197c45ac219921cc3106",
        "application_usage_daily": "20142d23fe5d05ba22b4bc46614d99883bc488f0",
        "application_usage_totals": "a29ab014edc20382b9ce22ede221b18cee5d93a6",
        "canvas-element": "b39dfe54b9ff3ecc4c6bc5bed6a14b0a0fe83644",
        "canvas-workpad": "4df66cf25eba8e7e25c061a1b2a5aadbb1f436e9",
        "canvas-workpad-template": "52a35f737b579a570510fca361fddd158d2a92ad",
        "cases": "3d968144040b829dddb8826bad90f9f0ab57a403",
        "cases-comments": "ded400d82c5ea26959c2ee8e54896981d499a226",
        "cases-configure": "44ed7b8e0f44df39516b8870589b89e32224d2bf",
        "cases-connector-mappings": "f9d1ac57e484e69506c36a8051e4d61f4a8cfd25",
        "cases-telemetry": "f219eb7e26772884342487fc9602cfea07b3cedc",
        "cases-user-actions": "483f10db9b3bd1617948d7032a98b7791bf87414",
        "config": "179b3e2bc672626aafce3cf92093a113f456af38",
        "config-global": "8e8a134a2952df700d7d4ec51abb794bbd4cf6da",
        "connector_token": "5a9ac29fe9c740eb114e9c40517245c71706b005",
        "core-usage-stats": "b3c04da317c957741ebcdedfea4524049fdc79ff",
        "csp-rule-template": "2a9d5f6481d8ca81d6e5ab0a7cc4ba0b59a93420",
        "dashboard": "cf7c9c2334decab716fe519780cb4dc52967a91d",
        "endpoint:user-artifact-manifest": "1c3533161811a58772e30cdc77bac4631da3ef2b",
        "enterprise_search_telemetry": "9ac912e1417fc8681e0cd383775382117c9e3d3d",
        "epm-packages": "2449bb565f987eff70b1b39578bb17e90c404c6e",
        "epm-packages-assets": "7a3e58efd9a14191d0d1a00b8aaed30a145fd0b1",
        "event_loop_delays_daily": "01b967e8e043801357503de09199dfa3853bab88",
        "exception-list": "4aebc4e61fb5d608cae48eaeb0977e8db21c61a4",
        "exception-list-agnostic": "6d3262d58eee28ac381ec9654f93126a58be6f5d",
        "file": "6b65ae5899b60ebe08656fd163ea532e557d3c98",
        "file-upload-usage-collection-telemetry": "06e0a8c04f991e744e09d03ab2bd7f86b2088200",
        "fileShare": "5be52de1747d249a221b5241af2838264e19aaa1",
        "fleet-fleet-server-host": "b04898fcde07f4ce86e844c8fe2f4b23b77ef60a",
        "fleet-message-signing-keys": "93421f43fed2526b59092a4e3c65d64bc2266c0f",
        "fleet-preconfiguration-deletion-record": "c52ea1e13c919afe8a5e8e3adbb7080980ecc08e",
        "fleet-proxy": "6cb688f0d2dd856400c1dbc998b28704ff70363d",
        "fleet-uninstall-tokens": "d25a8aedb522d2b839ab0950160777528122070f",
        "graph-workspace": "5cc6bb1455b078fd848c37324672163f09b5e376",
        "guided-onboarding-guide-state": "d338972ed887ac480c09a1a7fbf582d6a3827c91",
        "guided-onboarding-plugin-state": "bc109e5ef46ca594fdc179eda15f3095ca0a37a4",
        "index-pattern": "997108a9ea1e8076e22231e1c95517cdb192b9c5",
        "infrastructure-monitoring-log-view": "5f86709d3c27aed7a8379153b08ee5d3d90d77f5",
        "infrastructure-ui-source": "113182d6895764378dfe7fa9fa027244f3a457c4",
        "ingest-agent-policies": "8a91f7b9507605222901543167f48c313591daec",
        "ingest-download-sources": "d7edc5e588d9afa61c4b831604582891c54ef1c7",
        "ingest-outputs": "3f1e998887d48a706333b67885d1ad8f3217cd90",
        "ingest-package-policies": "7d0e8d288e193e0a8a153bb420c6056bc862c4c3",
        "ingest_manager_settings": "418311b03c8eda53f5d2ea6f54c1356afaa65511",
        "inventory-view": "b8683c8e352a286b4aca1ab21003115a4800af83",
        "kql-telemetry": "93c1d16c1a0dfca9c8842062cf5ef8f62ae401ad",
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
        "observability-onboarding-state": "c2a7439293913d69cc286a8f8f9885bc2dd9682f",
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
        "visualization": "cee4d02c56af349054642c6744bf9c471c1ad941",
        "workplace_search_telemetry": "10e278fe9ae1396bfc36ae574bc387d7e696d43f",
      }
    `);
  });
});
