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
        "alert": "3a67d3f1db80af36bd57aaea47ecfef87e43c58f",
        "api_key_pending_invalidation": "1399e87ca37b3d3a65d269c924eda70726cfe886",
        "apm-custom-dashboards": "b67128f78160c288bd7efe25b2da6e2afd5e82fc",
        "apm-indices": "8a2d68d415a4b542b26b0d292034a28ffac6fed4",
        "apm-server-schema": "58a8c6468edae3d1dc520f0134f59cf3f4fd7eff",
        "apm-service-group": "66dfc1ddd40bad8f693c873bf6002ca30079a4ae",
        "apm-telemetry": "4df255b8b022f5d160687db736b9abcd6ab173fe",
        "app_search_telemetry": "36234f19573ad397ac30197c45ac219921cc3106",
        "application_usage_daily": "20142d23fe5d05ba22b4bc46614d99883bc488f0",
        "application_usage_totals": "a29ab014edc20382b9ce22ede221b18cee5d93a6",
        "canvas-element": "cdedc2123eb8a1506b87a56b0bcce60f4ec08bc8",
        "canvas-workpad": "9d82aafb19586b119e5c9382f938abe28c26ca5c",
        "canvas-workpad-template": "c077b0087346776bb3542b51e1385d172cb24179",
        "cases": "2392189ed338857d4815a4cef6051f9ad124d39d",
        "cases-comments": "5cb0a421588831c2a950e50f486048b8aabbae25",
        "cases-configure": "44ed7b8e0f44df39516b8870589b89e32224d2bf",
        "cases-connector-mappings": "f9d1ac57e484e69506c36a8051e4d61f4a8cfd25",
        "cases-telemetry": "f219eb7e26772884342487fc9602cfea07b3cedc",
        "cases-user-actions": "483f10db9b3bd1617948d7032a98b7791bf87414",
        "cloud-security-posture-settings": "e0f61c68bbb5e4cfa46ce8994fa001e417df51ca",
        "config": "179b3e2bc672626aafce3cf92093a113f456af38",
        "config-global": "8e8a134a2952df700d7d4ec51abb794bbd4cf6da",
        "connector_token": "5a9ac29fe9c740eb114e9c40517245c71706b005",
        "core-usage-stats": "b3c04da317c957741ebcdedfea4524049fdc79ff",
        "csp-rule-template": "c151324d5f85178169395eecb12bac6b96064654",
        "dashboard": "211e9ca30f5a95d5f3c27b1bf2b58e6cfa0c9ae9",
        "endpoint:user-artifact-manifest": "1c3533161811a58772e30cdc77bac4631da3ef2b",
        "enterprise_search_telemetry": "9ac912e1417fc8681e0cd383775382117c9e3d3d",
        "epm-packages": "c23d3d00c051a08817335dba26f542b64b18a56a",
        "epm-packages-assets": "7a3e58efd9a14191d0d1a00b8aaed30a145fd0b1",
        "event-annotation-group": "715ba867d8c68f3c9438052210ea1c30a9362582",
        "event_loop_delays_daily": "01b967e8e043801357503de09199dfa3853bab88",
        "exception-list": "4aebc4e61fb5d608cae48eaeb0977e8db21c61a4",
        "exception-list-agnostic": "6d3262d58eee28ac381ec9654f93126a58be6f5d",
        "file": "6b65ae5899b60ebe08656fd163ea532e557d3c98",
        "file-upload-usage-collection-telemetry": "06e0a8c04f991e744e09d03ab2bd7f86b2088200",
        "fileShare": "5be52de1747d249a221b5241af2838264e19aaa1",
        "fleet-fleet-server-host": "69be15f6b6f2a2875ad3c7050ddea7a87f505417",
        "fleet-message-signing-keys": "93421f43fed2526b59092a4e3c65d64bc2266c0f",
        "fleet-preconfiguration-deletion-record": "c52ea1e13c919afe8a5e8e3adbb7080980ecc08e",
        "fleet-proxy": "6cb688f0d2dd856400c1dbc998b28704ff70363d",
        "fleet-uninstall-tokens": "ed8aa37e3cdd69e4360709e64944bb81cae0c025",
        "graph-workspace": "5cc6bb1455b078fd848c37324672163f09b5e376",
        "guided-onboarding-guide-state": "d338972ed887ac480c09a1a7fbf582d6a3827c91",
        "guided-onboarding-plugin-state": "bc109e5ef46ca594fdc179eda15f3095ca0a37a4",
        "index-pattern": "997108a9ea1e8076e22231e1c95517cdb192b9c5",
        "infra-custom-dashboards": "39f94b57c42c9028319b2f999805006171f122c8",
        "infrastructure-monitoring-log-view": "5f86709d3c27aed7a8379153b08ee5d3d90d77f5",
        "infrastructure-ui-source": "113182d6895764378dfe7fa9fa027244f3a457c4",
        "ingest-agent-policies": "7633e578f60c074f8267bc50ec4763845e431437",
        "ingest-download-sources": "279a68147e62e4d8858c09ad1cf03bd5551ce58d",
        "ingest-outputs": "daafff49255ab700e07491376fe89f04fc998b91",
        "ingest-package-policies": "8a99e165aab00c6c365540427a3abeb7bea03f31",
        "ingest_manager_settings": "91445219e7115ff0c45d1dabd5d614a80b421797",
        "inventory-view": "b8683c8e352a286b4aca1ab21003115a4800af83",
        "kql-telemetry": "93c1d16c1a0dfca9c8842062cf5ef8f62ae401ad",
        "legacy-url-alias": "9b8cca3fbb2da46fd12823d3cd38fdf1c9f24bc8",
        "lens": "5cfa2c52b979b4f8df56dd13c477e152183468b9",
        "lens-ui-telemetry": "8c47a9e393861f76e268345ecbadfc8a5fb1e0bd",
        "links": "1dd432cc94619a513b75cec43660a50be7aadc90",
        "maintenance-window": "d893544460abad56ff7a0e25b78f78776dfe10d1",
        "map": "76c71023bd198fb6b1163b31bafd926fe2ceb9da",
        "metrics-data-source": "81b69dc9830699d9ead5ac8dcb9264612e2a3c89",
        "metrics-explorer-view": "98cf395d0e87b89ab63f173eae16735584a8ff42",
        "ml-job": "150e1ab260e87f9963cc99e013304b9c54703dab",
        "ml-module": "94f210e60504fe0cc8241d867af97f8130250359",
        "ml-trained-model": "482195cefd6b04920e539d34d7356d22cb68e4f3",
        "monitoring-telemetry": "5d91bf75787d9d4dd2fae954d0b3f76d33d2e559",
        "observability-onboarding-state": "b16064c516aac64ae699c737d7d10b6e199bfded",
        "osquery-manager-usage-metric": "983bcbc3b7dda0aad29b20907db233abba709bcc",
        "osquery-pack": "702e86b1a936153b39f65b0781bdc136e186e123",
        "osquery-pack-asset": "cd140bc2e4b092e93692b587bf6e38051ef94c75",
        "osquery-saved-query": "6095e288750aa3164dfe186c74bc5195c2bf2bd4",
        "policy-settings-protection-updates-note": "33924bb246f9e5bcb876109cc83e3c7a28308352",
        "query": "501bece68f26fe561286a488eabb1a8ab12f1137",
        "risk-engine-configuration": "aea0c371a462e6d07c3ceb3aff11891b47feb09d",
        "rules-settings": "892a2918ebaeba809a612b8d97cec0b07c800b5f",
        "sample-data-telemetry": "37441b12f5b0159c2d6d5138a494c9f440e950b5",
        "search": "cf69e2bf8ae25c10af21887cd6effc4a9ea73064",
        "search-session": "b2fcd840e12a45039ada50b1355faeafa39876d1",
        "search-telemetry": "b568601618744720b5662946d3103e3fb75fe8ee",
        "security-rule": "07abb4d7e707d91675ec0495c73816394c7b521f",
        "security-solution-signals-migration": "9d99715fe5246f19de2273ba77debd2446c36bb1",
        "siem-detection-engine-rule-actions": "54f08e23887b20da7c805fab7c60bc67c428aff9",
        "siem-ui-timeline": "d3de8ff3617be8f2a799d66b1471b9be6124bf40",
        "siem-ui-timeline-note": "0a32fb776907f596bedca292b8c646496ae9c57b",
        "siem-ui-timeline-pinned-event": "082daa3ce647b33873f6abccf340bdfa32057c8d",
        "slo": "9a9995e4572de1839651c43b5fc4dc8276bb5815",
        "space": "8de4ec513e9bbc6b2f1d635161d850be7747d38e",
        "spaces-usage-stats": "3abca98713c52af8b30300e386c7779b3025a20e",
        "synthetics-monitor": "33ddc4b8979f378edf58bcc7ba13c5c5b572f42d",
        "synthetics-param": "3ebb744e5571de678b1312d5c418c8188002cf5e",
        "synthetics-privates-locations": "f53d799d5c9bc8454aaa32c6abc99a899b025d5c",
        "tag": "e2544392fe6563e215bb677abc8b01c2601ef2dc",
        "task": "d17f2fc0bf6759a070c2221ec2787ad785c680fe",
        "telemetry": "7b00bcf1c7b4f6db1192bb7405a6a63e78b699fd",
        "threshold-explorer-view": "175306806f9fc8e13fcc1c8953ec4ba89bda1b70",
        "ui-metric": "d227284528fd19904e9d972aea0a13716fc5fe24",
        "upgrade-assistant-ml-upgrade-operation": "421f52731cb24e242d70672ba4725e169277efb3",
        "upgrade-assistant-reindex-operation": "01f3c3e051659ace56492a73928987e717537a93",
        "uptime-dynamic-settings": "b6756ff71d6b5258971b1c8fd433d167affbde52",
        "uptime-synthetics-api-key": "7ae976a461248f9dbd8442af14a179bdbc229eca",
        "url": "c923a4a5002a09c0080c9095e958f07d518e6704",
        "usage-counters": "48782b3bcb6b5a23ba6f2bfe3a380d835e68890a",
        "visualization": "93a3e73994ad836fe2b1dccbe208238f41f63da0",
        "workplace_search_telemetry": "52b32b47ee576f554ac77cb1d5896dfbcfe9a1fb",
      }
    `);
  });
});
