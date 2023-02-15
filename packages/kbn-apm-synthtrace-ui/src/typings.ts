export type SynthtraceScenario = {
  instanceName: string;
  environment: string;
  isDistributedTracing: boolean;
  services?: Service[];
  items?: Array<Transaction | Span>;
  createModal: Partial<CreateModal>;
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
  environment?: string;
  name: string;
  agentName: ElasticAgentName;
};

export interface Transaction {
  id: string;
  serviceId: string;
  name: string;
  repeat?: number;
  children?: Array<Transaction | Span>;
}

export interface Span {
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
  createModal: { isOpen: false },
  services: [
    { name: 'synth-rum', agentName: 'rum-js', id: '1' },
    { name: 'synth-node', agentName: 'nodejs', id: '2' },
  ],
  items: [
    {
      id: 't1',
      name: '1rpm/1100ms',
      serviceId: '1',
      children: [
        {
          id: 't1.1',
          name: 'GET /nodejs/users',
          serviceId: '1',
          repeat: 10,
          children: [
            {
              name: 'GET /nodejs/users',
              id: 't3',
              serviceId: '2',
              children: [
                {
                  serviceId: '2',
                  id: 's1',
                  name: 'GET user*/_search',
                  type: 'DB',
                  subtype: 'elasticsearc',
                },
              ],
            },
          ],
        },
        {
          id: 't1.2',
          name: 'GET nodejs/products',
          repeat: 10,
          serviceId: '1',
          children: [],
        },
      ],
    },
  ],
};
