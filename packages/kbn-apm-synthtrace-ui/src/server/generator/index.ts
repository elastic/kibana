import {
  ApmSynthtraceEsClient,
  createLogger,
  LogLevel,
  ApmSynthtraceKibanaClient,
} from '@kbn/apm-synthtrace';
import { apm, Instance, timerange } from '@kbn/apm-synthtrace-client';
import { createEsClientForTesting } from '@kbn/test';
import { times } from 'lodash';
import { Readable } from 'stream';
import { Span, SynthtraceScenario, Transaction } from '../../typings';

const logger = createLogger(LogLevel.info);

function generateTrace({
  timestamp,
  entryTransaction,
  serviceInstances,
}: {
  timestamp: number;
  entryTransaction: Transaction;
  serviceInstances: Record<string, Instance>;
}) {
  function generate(
    item: Transaction | Span
  ): ReturnType<typeof serviceInstance.transaction> | ReturnType<typeof serviceInstance.span> {
    const serviceInstance = serviceInstances[item.serviceId];
    if (!serviceInstance) {
      throw new Error(`Invalid service id, ${item.serviceId}`);
    }

    const children =
      item.children?.flatMap((child) => {
        return times(child.repeat || 1, () => {
          return generate(child);
        });
      }) || [];

    const trace:
      | ReturnType<typeof serviceInstance.transaction>
      | ReturnType<typeof serviceInstance.span> =
      item.docType === 'transaction'
        ? serviceInstance
            .transaction({ transactionName: item.name })
            .timestamp(timestamp)
            .duration(100)
            .success()
            .children(...children)
        : serviceInstance
            .span({ spanName: item.name, spanType: item.type, spanSubtype: item.subtype })
            .timestamp(timestamp)
            .duration(100)
            .success()
            .children(...children);

    return trace;
  }
  return generate(entryTransaction);
}

export async function runSynthraceScenario({ scenario }: { scenario: SynthtraceScenario }) {
  const { services, entryTransaction, environment, instanceName } = scenario;
  if (!services) {
    throw new Error('Services not found');
  }
  if (!entryTransaction) {
    throw new Error('Entry transaction not found');
  }

  const client = createEsClientForTesting({
    esUrl: scenario.credentials.esEndpoint,
    requestTimeout: 10000,
    isCloud: false,
  });

  const synthtraceEsClient = new ApmSynthtraceEsClient({
    client,
    logger,
    refreshAfterIndex: true,
    version: '8.8.0',
  });

  const kibanaClient = new ApmSynthtraceKibanaClient({
    logger: logger,
    target: scenario.credentials.kibanaEndpoint,
  });
  synthtraceEsClient.pipeline(synthtraceEsClient.getDefaultPipeline(false));

  try {
    console.log('Bootstraping...');
    const packageVersion = await kibanaClient.fetchLatestApmPackageVersion();
    await kibanaClient.installApmPackage(packageVersion);
    console.log('Bootstrap done!');
  } catch (e) {
    throw new Error(
      'Something went wrong while install APM package. Are kibana and ES running?',
      e
    );
  }

  if (scenario.cleanApmIndices) {
    await synthtraceEsClient.clean();
  }

  const serviceInstances = Object.values(services).reduce<Record<string, Instance>>(
    (acc, service) => {
      return {
        ...acc,
        [service.id]: apm
          .service({
            name: service.name,
            environment: environment,
            agentName: service.agentName,
          })
          .instance(instanceName),
      };
    },
    {}
  );

  const traces = timerange('now-15m', 'now')
    .ratePerMinute(1)
    .generator((timestamp) => {
      return generateTrace({ timestamp, entryTransaction, serviceInstances });
    });

  await synthtraceEsClient.index(
    Readable.from(Array.from(traces).flatMap((event) => event.serialize()))
  );
}
