/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ApmFields, httpExitSpan } from '@kbn/apm-synthtrace-client';
import { service } from '@kbn/apm-synthtrace-client/src/lib/apm/service';
import { Transaction } from '@kbn/apm-synthtrace-client/src/lib/apm/transaction';
import { Scenario } from '../cli/scenario';
import { getSynthtraceEnvironment } from '../lib/utils/get_synthtrace_environment';
import { withClient } from '../lib/utils/with_client';

const environment = getSynthtraceEnvironment(__filename);

const scenario: Scenario<ApmFields> = async () => {
  const numServices = 500;

  const tracesPerMinute = 10;

  return {
    generate: ({ range, clients: { apmEsClient } }) => {
      const services = new Array(numServices)
        .fill(undefined)
        .map((_, idx) => {
          return service(`service-${idx}`, 'prod', environment).instance('service-instance');
        })
        .reverse();

      return withClient(
        apmEsClient,
        range.ratePerMinute(tracesPerMinute).generator((timestamp) => {
          const rootTransaction = services.reduce((prev, currentService) => {
            const tx = currentService
              .transaction(`GET /my/function`, 'request')
              .timestamp(timestamp)
              .duration(1000)
              .children(
                ...(prev
                  ? [
                      currentService
                        .span(
                          httpExitSpan({
                            spanName: `exit-span-${currentService.fields['service.name']}`,
                            destinationUrl: `http://address-to-exit-span-${currentService.fields['service.name']}`,
                          })
                        )
                        .timestamp(timestamp)
                        .duration(1000)
                        .children(prev),
                    ]
                  : [])
              );

            return tx;
          }, undefined as Transaction | undefined);

          return rootTransaction!;
        })
      );
    },
  };
};

export default scenario;
