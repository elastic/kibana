/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ISavedObjectTypeRegistry } from '@kbn/core-saved-objects-server';
import { getMigrationHash } from '@kbn/core-test-helpers-so-type-serializer';
import { Root } from '@kbn/core-root-server-internal';
import {
  createTestServers,
  createRootWithCorePlugins,
  type TestElasticsearchUtils,
} from '@kbn/core-test-helpers-kbn-server';
import { SAVED_OBJECT_TYPES_COUNT } from '@kbn/core-saved-objects-server-internal';

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
  // The number of types in the hashMap should never be reduced, it can only increase.
  // Removing saved object types is forbidden after 8.8.
  it('detecting migration related changes in registered types', () => {
    const allTypes = typeRegistry.getAllTypes();

    const hashMap = allTypes.reduce((map, type) => {
      map[type.name] = getMigrationHash(type);
      return map;
    }, {} as Record<string, string>);

    expect(hashMap).toMatchInlineSnapshot(`
      Object {
        "action": "0e6fc0b74c7312a8c11ff6b14437b93a997358b8",
        "action_task_params": "2e475d8b62e2de50b77f58cda309efb537e1d543",
        "ad_hoc_run_params": "c7419760e878207231c3c8a25ec4d78360e07bf7",
        "alert": "fdfebe5545433d5af03b19012becd947eb10b7fc",
        "api_key_pending_invalidation": "8f5554d1984854011b8392d9a6f7ef985bcac03c",
        "apm-custom-dashboards": "b67128f78160c288bd7efe25b2da6e2afd5e82fc",
        "apm-indices": "8a2d68d415a4b542b26b0d292034a28ffac6fed4",
        "apm-server-schema": "58a8c6468edae3d1dc520f0134f59cf3f4fd7eff",
        "apm-service-group": "66dfc1ddd40bad8f693c873bf6002ca30079a4ae",
        "apm-telemetry": "4df255b8b022f5d160687db736b9abcd6ab173fe",
        "app_search_telemetry": "36234f19573ad397ac30197c45ac219921cc3106",
        "application_usage_daily": "20142d23fe5d05ba22b4bc46614d99883bc488f0",
        "application_usage_totals": "a29ab014edc20382b9ce22ede221b18cee5d93a6",
        "background-task-node": "e61f0ea9923fa05b3af0aae6c6baf2f0283e14b3",
        "canvas-element": "cdedc2123eb8a1506b87a56b0bcce60f4ec08bc8",
        "canvas-workpad": "9d82aafb19586b119e5c9382f938abe28c26ca5c",
        "canvas-workpad-template": "c077b0087346776bb3542b51e1385d172cb24179",
        "cases": "91771732e2e488e4c1b1ac468057925d1c6b32b5",
        "cases-comments": "5cb0a421588831c2a950e50f486048b8aabbae25",
        "cases-configure": "44ed7b8e0f44df39516b8870589b89e32224d2bf",
        "cases-connector-mappings": "f9d1ac57e484e69506c36a8051e4d61f4a8cfd25",
        "cases-rules": "6d1776f5c46a99e1a0f3085c537146c1cdfbc829",
        "cases-telemetry": "f219eb7e26772884342487fc9602cfea07b3cedc",
        "cases-user-actions": "483f10db9b3bd1617948d7032a98b7791bf87414",
        "cloud": "b549f4f7ab1fd41aab366a66afa52a2a008aefea",
        "cloud-security-posture-settings": "e0f61c68bbb5e4cfa46ce8994fa001e417df51ca",
        "config": "0ff10ca7b058b5775556688280b48347cb18e281",
        "config-global": "8e8a134a2952df700d7d4ec51abb794bbd4cf6da",
        "connector_token": "79977ea2cb1530ba7e315b95c1b5a524b622a6b3",
        "core-usage-stats": "b3c04da317c957741ebcdedfea4524049fdc79ff",
        "csp-rule-template": "0cc86d4eb9f4eaf0e9ceab42a4c18a9ff9a43526",
        "dashboard": "6b768591e1fe390b9a358db017cb26cb2357807f",
        "dynamic-config-overrides": "ac104a1a4498f8d2e477681d9fb43449b4c56afa",
        "endpoint:unified-user-artifact-manifest": "4237f2cc2dbbc28504c70f1c2965b5f23710f9cb",
        "endpoint:user-artifact-manifest": "8ad9bd235dcfdc18b567aef0dc36ac686193dc89",
        "enterprise_search_telemetry": "4b41830e3b28a16eb92dee0736b44ae6276ced9b",
        "entity-definition": "02ea6a34291d939262c45f4f81da01249ba13753",
        "entity-discovery-api-key": "094f1eae0e069e5f8bf2523db1a14072a8e29271",
        "entity-engine-status": "49fb6dc6d70a935572faf4593800477beeccd120",
        "epm-packages": "1e236a1656734cc16f45946a48bfed2134799f7d",
        "epm-packages-assets": "00c8b5e5bf059627ffc9fbde920e1ac75926c5f6",
        "event-annotation-group": "c67d5863d7cac02d800c543724ef29b66d12e77e",
        "event_loop_delays_daily": "ef49e7f15649b551b458c7ea170f3ed17f89abd0",
        "exception-list": "38181294f64fc406c15f20d85ca306c8a4feb3c0",
        "exception-list-agnostic": "d527ce9d12b134cb163150057b87529043a8ec77",
        "favorites": "a4db4c97692e8468c96abac1cbd2b9d57150f173",
        "file": "487a562dd895407307980cc4404ca08e87e8999d",
        "file-upload-usage-collection-telemetry": "c6fcb9a7efcf19b2bb66ca6e005bfee8961f6073",
        "fileShare": "f07d346acbb724eacf139a0fb781c38dc5280115",
        "fleet-agent-policies": "a977f4de060fc15e49148e4c26680d1dee5c5205",
        "fleet-fleet-server-host": "795c0e79438a260bd860419454bcc432476d4396",
        "fleet-message-signing-keys": "0c6da6a680807e568540b2aa263ae52331ba66db",
        "fleet-package-policies": "be03d7cf73c3757a1bf65cbf77a5a4ff809ae682",
        "fleet-preconfiguration-deletion-record": "3afad160748b430427086985a3445fd8697566d5",
        "fleet-proxy": "94d0a902a0fd22578d7d3a20873b95d902e25245",
        "fleet-setup-lock": "ce9a2dcfb2e6f7260d129636a26c9ca98b13e464",
        "fleet-space-settings": "b8f60506cf5fea1429ad84dfb8644cf261fd7427",
        "fleet-uninstall-tokens": "216be68d8426052f9e7529e2e0569b7950676537",
        "graph-workspace": "565642a208fe7413b487aea979b5b153e4e74abe",
        "guided-onboarding-guide-state": "3257825ae840309cb676d64b347107db7b76f30a",
        "guided-onboarding-plugin-state": "2d3ef3069ca8e981cafe8647c0c4a4c20739db10",
        "index-pattern": "cd51191712081278c2af83d16552c3438ef83353",
        "infra-custom-dashboards": "20231f5c1a13633c8c85f4e1257fa0c6156f6714",
        "infrastructure-monitoring-log-view": "8040108f02ef27419cff79077384379709d44bbc",
        "infrastructure-ui-source": "2311f7d0abe2a713aa71e30ee24f78828d4acfc1",
        "ingest-agent-policies": "11945ce3f87ad242d6fc89509c4318dae74008cc",
        "ingest-download-sources": "e6b6c76a67a1882c861177ee9e8ff2c607b7eeea",
        "ingest-outputs": "f92200366d6b9f142a81f094154e17987910c535",
        "ingest-package-policies": "c12bdd0a3d35255265d501e3ab0e266579b5fbbf",
        "ingest_manager_settings": "164096e0a8957ad8e7a298372c27035e73bf3bb6",
        "inventory-view": "e125c6e6e49729055421e7b3a0544f24330d8dc6",
        "kql-telemetry": "92d6357aa3ce28727492f86a54783f802dc38893",
        "legacy-url-alias": "9b8cca3fbb2da46fd12823d3cd38fdf1c9f24bc8",
        "lens": "6fa6bdc5de12859815de6e50488fa2a7b038278a",
        "lens-ui-telemetry": "d6c4e330d170eefc6214dbf77a53de913fa3eebc",
        "links": "53ae5a770d69eee34d842617be761cd059ab4b51",
        "maintenance-window": "f3f19d1828e91418d13703ce6009e9c76a1686f9",
        "map": "7902b2e2a550e0b73fd5aa6c4e2ba3a4e6558877",
        "metrics-data-source": "6525efc71b46a85f12a13953c4be15a9eb316723",
        "metrics-explorer-view": "713dbf1ab5e067791d19170f715eb82cf07ebbcc",
        "ml-job": "12e21f1b1adfcc1052dc0b10c7459de875653b94",
        "ml-module": "7747963b9646733cb1996f13fb64f5cf046e65d9",
        "ml-trained-model": "49a1685d79990ad05ea1d1d30e28456fe002f3b9",
        "monitoring-telemetry": "24f7393dfacb6c7b0f7ad7d242171a1c29feaa48",
        "observability-onboarding-state": "1ac5d69f51382ecbc999b2922754baabc1316fba",
        "osquery-manager-usage-metric": "23a8f08a98dd0f58ab4e559daa35b06edc40ed4f",
        "osquery-pack": "784df8f1045e38a3fff4b77ce9aa729bfc0c3058",
        "osquery-pack-asset": "42d5503cd17e1a08e7d822843934f3c92972e246",
        "osquery-saved-query": "a8ef11610473e3d1b51a8fdacb2799d8a610818e",
        "policy-settings-protection-updates-note": "c05c4c33a5e5bd1fa153991f300d040ac5d6f38d",
        "privilege-monitoring-status": "4daec76df427409bcd64250f5c23f5ab86c8bac3",
        "product-doc-install-status": "ee7817c45bf1c41830290c8ef535e726c86f7c19",
        "query": "1966ccce8e9853018111fb8a1dee500228731d9e",
        "risk-engine-configuration": "533a0a3f2dbef1c95129146ec4d5714de305be1a",
        "rules-settings": "53f94e5ce61f5e75d55ab8adbc1fb3d0937d2e0b",
        "sample-data-telemetry": "c38daf1a49ed24f2a4fb091e6e1e833fccf19935",
        "search": "33a40cd7fc42cbeabe8e4237fc8377727ae375f7",
        "search-session": "fae0dfc63274d6a3b90ca583802c48cab8760637",
        "search-telemetry": "1bbaf2db531b97fa04399440fa52d46e86d54dd8",
        "search_playground": "3eba7e7c4563f03f76aea02f5dd3a7a739bf51a3",
        "security-ai-prompt": "1fc1c56cc078ed2c5506bb5a4e09f6876d02c97c",
        "security-rule": "151108f4906744a137ddc89f5988310c5b9ba8b6",
        "security-solution-signals-migration": "0be3bed0f2ff4fe460493751b8be610a785c5c98",
        "siem-detection-engine-rule-actions": "123c130dc38120a470d8db9fed9a4cebd2046445",
        "siem-ui-timeline": "9906092f527a21abdfab10e43c86b228ebc3861b",
        "siem-ui-timeline-note": "13c9d4c142f96624a93a623c6d7cba7e1ae9b5a6",
        "siem-ui-timeline-pinned-event": "96a43d59b9e2fc11f12255a0cb47ef0a3d83af4c",
        "slo": "79878844eda6ac3d858c19255d9714752b1bb081",
        "slo-settings": "9a74f29769cb973a726852fcb1129481b45ce577",
        "space": "758dd69293d1cd5a0190753cfd93101fe7693604",
        "spaces-usage-stats": "084bd0f080f94fb5735d7f3cf12f13ec92f36bad",
        "synthetics-dynamic-settings": "7804b079cc502f16526f7c9491d1397cc1ec67db",
        "synthetics-monitor": "ed46c9bfc58fba359c9a9538a871a03a53cc6454",
        "synthetics-param": "9776c9b571d35f0d0397e8915e035ea1dc026db7",
        "synthetics-private-location": "27aaa44f792f70b734905e44e3e9b56bbeac7b86",
        "synthetics-privates-locations": "36036b881524108c7327fe14bd224c6e4d972cb5",
        "tag": "87f21f07df9cc37001b15a26e413c18f50d1fbfe",
        "task": "f07a047b32e52f6c2bf569764536f4378af47e3f",
        "telemetry": "3b3b89cf411a2a2e60487cef6ccdbc5df691aeb9",
        "threshold-explorer-view": "5e2388a6835cec3c68c98b450cd267d66cce925f",
        "ui-metric": "410a8ad28e0f44b161c960ff0ce950c712b17c52",
        "upgrade-assistant-ml-upgrade-operation": "d8816e5ce32649e7a3a43e2c406c632319ff84bb",
        "upgrade-assistant-reindex-operation": "09ac8ed9c9acf7e8ece8eafe47d7019ea1472144",
        "uptime-dynamic-settings": "001c1cc76876af3012445b1ba2adb60cae9c9180",
        "uptime-synthetics-api-key": "599319bedbfa287e8761e1ba49d536417a33fa13",
        "url": "816fa15bfe460ce39108ed8095e60fdbfcc40f11",
        "usage-counter": "1fba2f21e9ec360324a96bab3760c1055c78d1c1",
        "usage-counters": "f478b2668be350f5bdc08d9e1cf6fbce0e079f61",
        "visualization": "cee4d02c56af349054642c6744bf9c471c1ad941",
        "workplace_search_telemetry": "10e278fe9ae1396bfc36ae574bc387d7e696d43f",
      }
    `);
    expect(Object.keys(hashMap).length).toEqual(SAVED_OBJECT_TYPES_COUNT);
  });
});
