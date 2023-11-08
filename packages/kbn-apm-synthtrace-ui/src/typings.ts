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
  credentials: Credentials;
};

export interface Credentials {
  esEndpoint: string;
  kibanaEndpoint: string;
}

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
