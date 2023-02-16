import { EuiComboBoxOptionOption } from '@elastic/eui';

export type SynthtraceScenario = {
  instanceName: string;
  environment: string;
  isDistributedTracing: boolean;
  topLevelService?: Service;
  cleanApmIndices: boolean;
  services?: {
    [key: string]: Service;
  };
  entryTransaction?: Transaction;
  modalForm: ModalForm;
};

// TODO: Rename this type to something more generic
export type ModalForm = {
  isOpen: boolean;
  isEdit: boolean;
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
  color: string;
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

export type ServiceSelectorSelectedOption = EuiComboBoxOptionOption<ElasticAgentName> & {
  key: string;
  value: ElasticAgentName;
};

export const example: SynthtraceScenario = {
  instanceName: '1',
  environment: 'prod',
  isDistributedTracing: false,
  cleanApmIndices: true,
  modalForm: {
    isOpen: false,
    isEdit: false,
    type: 'service',
    serviceId: '',
    id: '',
  },
  topLevelService: {
    name: 'synth-rum',
    id: '1',
    agentName: 'rum-js',
    color: '#000',
  },
  services: {
    '1': {
      name: 'synth-rum',
      agentName: 'rum-js',
      id: '1',
      color: '#000',
    },
    '2': {
      name: 'synth-node',
      agentName: 'nodejs',
      id: '2',
      color: '#000',
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
