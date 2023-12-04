/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { ApmFields, apm, Instance } from '@kbn/apm-synthtrace-client';
import { Scenario } from '../cli/scenario';
import { getSynthtraceEnvironment } from '../lib/utils/get_synthtrace_environment';
import { withClient } from '../lib/utils/with_client';

const ENVIRONMENT = getSynthtraceEnvironment(__filename);

const scenario: Scenario<ApmFields> = async (runOptions) => {
  const { logger } = runOptions;

  return {
    generate: ({ range, clients: { apmEsClient } }) => {
      const transactionName = '240rpm/75% 1000ms';
      const languages = ['dotnet', 'go', 'java', 'node', 'php', 'python', 'ruby'];

      const stacktraceExamples: Record<string, string[]> = {
        'synth-dotnet': [
          'OpbeansDotnet.Controllers.CustomersController in Get in /src/opbeans-dotnet/Controllers/CustomersController.cs at line 23',
          'Microsoft.EntityFrameworkCore.Query.Internal.LinqOperatorProvider+ResultEnumerable`1 in GetEnumerator',
        ],
        'synth-go': ['main.go in Main.func2 at line 196'],
        'synth-java': [
          'at org.apache.catalina.connector.OutputBuffer.flushByteBuffer(OutputBuffer.java:825)',
        ],
        'synth-node': [
          'at callbackTrampoline (internal/async_hooks.js:120)',
          'at TCPConnectWrap.onStreamRead (internal/stream_base_commons.js:205)',
          'at  (internal/stream_base_commons.js:205)',
        ],
        'synth-php': [
          '#1   PDOStatement->execute() called at [/app/vendor/laravel/framework/src/Illuminate/Database/Connectors/PostgresConnector.php:87]',
        ],
        'synth-python': ['opbeans/views.py in orders at line 190'],
        'synth-ruby': ["api/customers_controller.rb:15 in `show'"],
      };

      const timestamps = range.interval('1m').rate(180);

      const instances = languages.map((lang) =>
        apm
          .service({
            name: `synth-${lang}`,
            environment: ENVIRONMENT,
            agentName: lang,
          })
          .instance(`instance-${lang}`)
      );

      const instanceSpans = (instance: Instance, stacktraces: string[]) =>
        timestamps.generator((timestamp) =>
          instance
            .transaction({ transactionName: `Transaction ${instance.fields['service.name']}` })
            .timestamp(timestamp)
            .duration(1000)
            .success()
            .children(
              ...stacktraces.map((item, index) =>
                instance
                  .span({
                    spanName: `custom_operation ${index}`,
                    spanType: 'custom',
                    'code.stacktrace': item,
                  })
                  .duration(180)
                  .destination('elasticsearch')
                  .failure()
                  .timestamp(timestamp)
              )
            )
        );

      return withClient(
        apmEsClient,
        logger.perf('generating_apm_events', () =>
          instances.flatMap((instance) =>
            instanceSpans(instance, stacktraceExamples[instance.fields['service.name']!])
          )
        )
      );
    },
  };
};

export default scenario;
