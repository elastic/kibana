export type SynthtraceScenario = {
  instanceName: string;
  environment: string;
  isDistributedTracing: boolean;
  topLevelService?: Service;
  services?: Record<string, Service>;
  entryTransaction?: Transaction;
  createModal?: Partial<CreateModal>;
};

// TODO: Rename this type to something more generic
export type CreateModal = {
  isOpen: boolean;
  type: ModalType;
  serviceId: string;
  id: string;
};

export type ModalType = 'service' | 'span' | 'transaction';

export type ElasticAgentName =
  | 'go'
  | 'java'
  | 'js-base'
  | 'iOS/swift'
  | 'rum-js'
  | 'nodejs'
  | 'python'
  | 'dotnet'
  | 'ruby'
  | 'php'
  | 'android/java';

export type Service = {
  id: string;
  name: string;
  agentName: ElasticAgentName;
};

export interface Transaction {
  docType: 'transaction';
  id: string;
  serviceId: string;
  name: string;
  repeat?: number;
  children?: Array<Transaction | Span>;
}

export interface Span {
  docType: 'span';
  id: string;
  serviceId: string;
  name: string;
  type: string;
  subtype: string;
  repeat?: number;
  children?: Array<Transaction | Span>;
}

export const example: SynthtraceScenario = {
  instanceName: '1',
  environment: 'prod',
  isDistributedTracing: false,
  createModal: {
    isOpen: false,
  },
  topLevelService: {
    name: 'synth-rum',
    id: '1',
    agentName: 'rum-js',
  },
  services: {
    '1': {
      name: 'synth-rum',
      agentName: 'rum-js',
      id: '1',
    },
    '2': {
      name: 'synth-node',
      agentName: 'nodejs',
      id: '2',
    },
  },
  entryTransaction: {
    //transaction
    docType: 'transaction',
    id: 't1',
    name: '1rpm/1100ms',
    serviceId: '1',
    children: [
      {
        docType: 'transaction',
        name: 'foo-tx1',
        id: 't1.1',
        serviceId: '1',
        repeat: 1,
        children: [
          {
            docType: 'transaction',
            name: 'foo-tx2',
            serviceId: '1',
            id: 't1.1.1',
            repeat: 2,
            children: [
              {
                docType: 'span',
                //SPAN
                serviceId: '2',
                id: 's1',
                name: 'GET user*/_search',
                type: 'DB',
                subtype: 'elasticsearc',
                repeat: 1,
              },
            ],
          },
        ],
      },
    ],
  },
};
