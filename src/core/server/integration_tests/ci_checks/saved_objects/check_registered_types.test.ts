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
        "action": "696d997e420024a8cf973da94d905c8756e1177c",
        "action_task_params": "cd91a48515202852ebf1fed0d999cd96f6b2823e",
        "ad_hoc_run_params": "690b8991f48c73a04e6a8cf41fd4967a42f8e552",
        "alert": "581f322afd6784aebdb80f872b825a928533d364",
        "api_key_pending_invalidation": "cef0693ec88475a0e1f43614cfa6ca43c24d0338",
        "apm-custom-dashboards": "9b08d5d5222131c6981a70144b1d61648757a613",
        "apm-indices": "b844821e9675768b1cb78f6d91ff336ed09d4739",
        "apm-server-schema": "6ee813dd2407b061b4eeda92c5f695d3bf9827df",
        "apm-service-group": "3843d13e18dd2071d68de0cec9787eb0f83f6af5",
        "apm-telemetry": "9c02ac4e9778422cb7f66a4d6b62f672df4644cc",
        "app_search_telemetry": "9269643c9a5894998b44883f7f7d07a453fd6a95",
        "application_usage_daily": "9867f6e1355124f822beab051e0fbac4cc117eac",
        "application_usage_totals": "9469a48ab887761a73ee3719b8d401ac627f1eb1",
        "background-task-node": "1c7a5767b34d1b5672758b604296f662bde68d0a",
        "canvas-element": "288fd8d216eb49cbeb5e8f7491f207ef074b80dd",
        "canvas-workpad": "5cd605383a100a27941cca6cbf2d954aa96a16e2",
        "canvas-workpad-template": "f9a6ffab76ddfcd8fa3823002aa576c8f1d0e686",
        "cases": "2388ee2fdb90369bddf8bee195c86e0471144278",
        "cases-comments": "9e336aceb6a330452d1cbf0ba1b8fd542c9e3856",
        "cases-configure": "66d4c64d83b464f5166005b8ffa03b721fcaaf8b",
        "cases-connector-mappings": "877bb4d52e9821e330622bd75fba799490ec6952",
        "cases-incrementing-id": "3dfb6dac9c28faab1b484d80cf274aa726399e36",
        "cases-rules": "24c69413a726f1b4c37c000acc4216ff046af59f",
        "cases-telemetry": "fdeddcef28c75d8c66422475a829e75d37f0b668",
        "cases-user-actions": "8ad74294b71edffa58fad7a40eea2388209477c9",
        "cloud": "783f93b25887278becdf83841addd4e726550a51",
        "cloud-security-posture-settings": "20453bee65db286a2cc1994e65cf4d7297d8173e",
        "config": "01265f01c36c7776d6a573262a6ede109633e302",
        "config-global": "d9791e8f73edee884630e1cb6e4954ae513ce75e",
        "connector_token": "e25821ecec3061806a6a9d4953273c18a749cc0f",
        "core-usage-stats": "b3c04da317c957741ebcdedfea4524049fdc79ff",
        "csp-rule-template": "0cc86d4eb9f4eaf0e9ceab42a4c18a9ff9a43526",
        "dashboard": "f9707fef3d017b4b7174b1dfa3fa7f72946b3217",
        "dynamic-config-overrides": "ac104a1a4498f8d2e477681d9fb43449b4c56afa",
        "endpoint:unified-user-artifact-manifest": "4237f2cc2dbbc28504c70f1c2965b5f23710f9cb",
        "endpoint:user-artifact-manifest": "8ad9bd235dcfdc18b567aef0dc36ac686193dc89",
        "enterprise_search_telemetry": "4b41830e3b28a16eb92dee0736b44ae6276ced9b",
        "entity-analytics-monitoring-entity-source": "ea3c5c3bdbde757e273b00f00eb6686c0f92cd78",
        "entity-definition": "02ea6a34291d939262c45f4f81da01249ba13753",
        "entity-discovery-api-key": "094f1eae0e069e5f8bf2523db1a14072a8e29271",
        "entity-engine-status": "49fb6dc6d70a935572faf4593800477beeccd120",
        "epm-packages": "3d5ac22ede7b06c6458f30d55ec7be79d2c206e8",
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
        "fleet-package-policies": "4da7cd2662ab79ea708ac51f0627451dd91f122d",
        "fleet-preconfiguration-deletion-record": "a9d20d9d21c2118fd35f21fb5eb1e3f68fa6889c",
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
        "ingest-package-policies": "241517da7d60b1c2bed48fb101f81310a60f179c",
        "ingest_manager_settings": "164096e0a8957ad8e7a298372c27035e73bf3bb6",
        "intercept_interaction_record": "49cb0d8f1b4d83ced8b8cd0e7889e238bbb18e6f",
        "intercept_trigger_record": "c159867102e5bea197a2c7754505210f10310479",
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
        "privmon-api-key": "c06b1614786ce7271087378b47d465c956ab1537",
        "product-doc-install-status": "f94e3e5ad2cc933df918f2cd159044c626e01011",
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
        "security:reference-data": "3b68791ae5b2312593eee105277cdc3918f39ed7",
        "siem-detection-engine-rule-actions": "123c130dc38120a470d8db9fed9a4cebd2046445",
        "siem-ui-timeline": "9906092f527a21abdfab10e43c86b228ebc3861b",
        "siem-ui-timeline-note": "13c9d4c142f96624a93a623c6d7cba7e1ae9b5a6",
        "siem-ui-timeline-pinned-event": "96a43d59b9e2fc11f12255a0cb47ef0a3d83af4c",
        "slo": "79878844eda6ac3d858c19255d9714752b1bb081",
        "slo-settings": "9a74f29769cb973a726852fcb1129481b45ce577",
        "space": "758dd69293d1cd5a0190753cfd93101fe7693604",
        "spaces-usage-stats": "084bd0f080f94fb5735d7f3cf12f13ec92f36bad",
        "synthetics-dynamic-settings": "7804b079cc502f16526f7c9491d1397cc1ec67db",
        "synthetics-monitor": "fdebfa2449d2b934972d1743dc78c34ae9ebc9c1",
        "synthetics-monitor-multi-space": "c8c9dab447ba8a7383041f55ba80757365d114c5",
        "synthetics-param": "9776c9b571d35f0d0397e8915e035ea1dc026db7",
        "synthetics-private-location": "27aaa44f792f70b734905e44e3e9b56bbeac7b86",
        "synthetics-privates-locations": "36036b881524108c7327fe14bd224c6e4d972cb5",
        "tag": "87f21f07df9cc37001b15a26e413c18f50d1fbfe",
        "task": "689edead32ea09558ceb54f64fd9aa4d324d94d0",
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
