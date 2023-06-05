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
        "composite-slo": "d771c24af50d7ca5667a046b63ed024a4bfd819d",
        "config": "179b3e2bc672626aafce3cf92093a113f456af38",
        "config-global": "8e8a134a2952df700d7d4ec51abb794bbd4cf6da",
        "connector_token": "5a9ac29fe9c740eb114e9c40517245c71706b005",
        "core-usage-stats": "b3c04da317c957741ebcdedfea4524049fdc79ff",
        "csp-rule-template": "c151324d5f85178169395eecb12bac6b96064654",
        "dashboard": "1635368413415b340ae6f43fcd0a55c5dcdd4f41",
        "endpoint:user-artifact-manifest": "1c3533161811a58772e30cdc77bac4631da3ef2b",
        "enterprise_search_telemetry": "9ac912e1417fc8681e0cd383775382117c9e3d3d",
        "epm-packages": "2449bb565f987eff70b1b39578bb17e90c404c6e",
        "epm-packages-assets": "7a3e58efd9a14191d0d1a00b8aaed30a145fd0b1",
        "event-annotation-group": "715ba867d8c68f3c9438052210ea1c30a9362582",
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
        "lens": "fd6a7938f41888e5ee499fcc5e749489981393aa",
        "lens-ui-telemetry": "8c47a9e393861f76e268345ecbadfc8a5fb1e0bd",
        "maintenance-window": "d893544460abad56ff7a0e25b78f78776dfe10d1",
        "map": "76c71023bd198fb6b1163b31bafd926fe2ceb9da",
        "metrics-explorer-view": "98cf395d0e87b89ab63f173eae16735584a8ff42",
        "ml-job": "150e1ab260e87f9963cc99e013304b9c54703dab",
        "ml-module": "2225cbb4bd508ea5f69db4b848be9d8a74b60198",
        "ml-trained-model": "482195cefd6b04920e539d34d7356d22cb68e4f3",
        "monitoring-telemetry": "5d91bf75787d9d4dd2fae954d0b3f76d33d2e559",
        "observability-onboarding-state": "c2a7439293913d69cc286a8f8f9885bc2dd9682f",
        "osquery-manager-usage-metric": "983bcbc3b7dda0aad29b20907db233abba709bcc",
        "osquery-pack": "6ab4358ca4304a12dcfc1777c8135b75cffb4397",
        "osquery-pack-asset": "b14101d3172c4b60eb5404696881ce5275c84152",
        "osquery-saved-query": "44f1161e165defe3f9b6ad643c68c542a765fcdb",
        "query": "8db5d48c62d75681d80d82a42b5642f60d068202",
        "rules-settings": "892a2918ebaeba809a612b8d97cec0b07c800b5f",
        "sample-data-telemetry": "37441b12f5b0159c2d6d5138a494c9f440e950b5",
        "search": "8d5184dd5b986d57250b6ffd9ae48a1925e4c7a3",
        "search-session": "b2fcd840e12a45039ada50b1355faeafa39876d1",
        "search-telemetry": "b568601618744720b5662946d3103e3fb75fe8ee",
        "security-rule": "07abb4d7e707d91675ec0495c73816394c7b521f",
        "security-solution-signals-migration": "9d99715fe5246f19de2273ba77debd2446c36bb1",
        "siem-detection-engine-rule-actions": "54f08e23887b20da7c805fab7c60bc67c428aff9",
        "siem-ui-timeline": "670a02b3c2a399bca781ff1e4781793b208b471a",
        "siem-ui-timeline-note": "0a32fb776907f596bedca292b8c646496ae9c57b",
        "siem-ui-timeline-pinned-event": "082daa3ce647b33873f6abccf340bdfa32057c8d",
        "slo": "4415e0ae7af10b79a207843acee454a931a01386",
        "space": "8de4ec513e9bbc6b2f1d635161d850be7747d38e",
        "spaces-usage-stats": "3abca98713c52af8b30300e386c7779b3025a20e",
        "synthetics-monitor": "ca7c0710c0607e44b2c52e5a41086b8b4a214f63",
        "synthetics-param": "3ebb744e5571de678b1312d5c418c8188002cf5e",
        "synthetics-privates-locations": "9cfbd6d1d2e2c559bf96dd6fbc27ff0c47719dd3",
        "tag": "e2544392fe6563e215bb677abc8b01c2601ef2dc",
        "task": "04f30bd7bae923f3a53c31ab3b9745a93872fc02",
        "telemetry": "7b00bcf1c7b4f6db1192bb7405a6a63e78b699fd",
        "ui-metric": "d227284528fd19904e9d972aea0a13716fc5fe24",
        "upgrade-assistant-ml-upgrade-operation": "421f52731cb24e242d70672ba4725e169277efb3",
        "upgrade-assistant-reindex-operation": "01f3c3e051659ace56492a73928987e717537a93",
        "uptime-dynamic-settings": "a9e9c42d8c1b6643946f32558478b274de0f89e0",
        "uptime-synthetics-api-key": "7ae976a461248f9dbd8442af14a179bdbc229eca",
        "url": "c923a4a5002a09c0080c9095e958f07d518e6704",
        "usage-counters": "48782b3bcb6b5a23ba6f2bfe3a380d835e68890a",
        "visualization": "93a3e73994ad836fe2b1dccbe208238f41f63da0",
        "workplace_search_telemetry": "52b32b47ee576f554ac77cb1d5896dfbcfe9a1fb",
      }
    `);
  });
});
