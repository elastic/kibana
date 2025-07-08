export interface Tag {
  id: string;
  name: string;
}

export enum RunStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
  RUNNING = 'running',
  CANCELLED = 'cancelled',
}

export interface WorkflowTrigger {
  id: string;
  type: 'manual' | 'schedule';
  enabled: boolean;
  config: Record<string, any>;
}

export interface RunHistoryItem {
  id: string;
  status: RunStatus;
  startedAt: string;
  finishedAt: string | null;
  duration: number | null;
}

export interface WorkflowListItemDTO {
  id: string;
  name: string;
  description: string;
  triggers: WorkflowTrigger[];
  tags: Tag[];
  enabled: boolean;
  runHistory: RunHistoryItem[];
}

export interface WorkflowListDTO {
  results: WorkflowListItemDTO[];
  _pagination: {
    limit: number;
    offset: number;
    total: number;
  };
}

// ts-ignore
// TODO: replace with a proper type
export interface WorkflowDefinition {
  steps: any[];
}

// TODO: replace with a proper type
export interface User {
  id: string;
  name: string;
  email: string;
}

export interface WorkflowDetailDTO extends WorkflowListItemDTO {
  definition: WorkflowDefinition;
  createdBy: User;
  createdAt: string;
  updatedAt: string;
}
