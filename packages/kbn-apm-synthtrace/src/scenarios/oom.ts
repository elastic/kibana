/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ApmFields, serviceMap, apm, Instance } from '@kbn/apm-synthtrace-client';
import { Scenario } from '../cli/scenario';
import { RunOptions } from '../cli/utils/parse_run_cli_flags';
import { getSynthtraceEnvironment } from '../lib/utils/get_synthtrace_environment';
import { withClient } from '../lib/utils/with_client';

const environment = getSynthtraceEnvironment(__filename);

const scenario: Scenario<ApmFields> = async (runOptions: RunOptions) => {
  return {
    generate: ({ range, clients: { apmEsClient } }) => {
      const serviceCount = 600;
      const serviceDefinitions = Array.from({ length: serviceCount }, (_, i) => ({
        name: `service-${i + 1}`,
        type: 'nodejs',
      }));

      // Function to create service instances
      const createServiceInstances = (definitions: Array<{ name: string; type: string }>) => {
        return definitions.map((definition) =>
          apm
            .service({
              name: definition.name,
              environment: 'Synthtrace: service_map',
              agentName: definition.type,
            })
            .instance(definition.name)
        );
      };

      const serviceInstances = createServiceInstances(serviceDefinitions);

      const generateSimplePaths = (instances: Instance[]) => {
        // Get the first 10 elements
        const passThroughServices = instances.slice(0, 500);

        const rootServices = instances.slice(500);

        return rootServices.map((rootService) => {
          const passThroughPaths = passThroughServices.map((service) => [
            service,
            `GET ${service.fields['service.name']}-search`,
          ]);

          const path = [
            [rootService, `endpoint-${rootService.fields['service.name']}`],
            ...passThroughPaths,
            ['elasticsearch', `GET ${rootService.fields['service.name']}-search`],
          ];

          return path;
        });
      };

      const paths = generateSimplePaths(serviceInstances);

      return withClient(
        apmEsClient,
        range
          .interval('10s')
          .rate(1)
          .generator(
            serviceMap({
              services: serviceDefinitions.map((definition) => ({
                [definition.name]: definition.type,
              })),
              definePaths: () => paths,
            })
          )
      );
    },
  };
};

export default scenario;
