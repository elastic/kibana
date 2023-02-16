import { SynthtraceScenario } from '../../typings';
import { runSynthraceScenario } from './index';

const scenario: SynthtraceScenario = {
  environment: 'production',
  instanceName: 'instance-1',
  isDistributedTracing: true,
  services: {
    '1': { id: '1', name: 'synth-java-6', agentName: 'java' },
    '2': { id: '2', name: 'synth-node', agentName: 'nodejs' },
  },
  createModal: {},
  entryTransaction: {
    docType: 'transaction',
    id: 'java-tx-1',
    name: 'java-tx-1',
    serviceId: '1',
    children: [
      {
        docType: 'span',
        name: 'GET apm-*/_search',
        type: 'db',
        subtype: 'elasticsearch',
        serviceId: '1',
        id: 'span-1',
        repeat: 5,
      },
      {
        docType: 'transaction',
        name: 'GET /products',
        id: 'transaction-2',
        serviceId: '2',
        repeat: 10,
        children: [
          {
            docType: 'span',
            name: 'GET /products',
            type: 'external',
            subtype: 'http',
            serviceId: '2',
            id: 'span-2',
            children: [
              {
                docType: 'span',
                name: 'GET products-*/_search',
                type: 'db',
                subtype: 'elasticsearch',
                serviceId: '2',
                id: 'span-3',
              },
            ],
          },
          {
            docType: 'span',
            name: 'GET /products',
            type: 'foo',
            subtype: 'bar',
            id: 'span-4',
            serviceId: '2',
          },
        ],
      },
    ],
  },
};

async function run() {
  await runSynthraceScenario({ scenario });
}

run();
