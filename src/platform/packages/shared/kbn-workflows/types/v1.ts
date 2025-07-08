export enum ExecutionStatus {
  // In progress
  PENDING = 'pending',
  RSVP = 'rsvp',
  RUNNING = 'running',

  // Done
  SUCCESS = 'success',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: ExecutionStatus;
  startedAt: string;
  finishedAt: string | null;
  duration: number | null;
}

// TODO: execution logs and results

export enum WorkflowStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DELETED = 'deleted',
}

export interface WorkflowTrigger {
  id: string;
  type: 'manual' | 'schedule';
  enabled: boolean;
  config?: Record<string, any>;
}

export interface WorkflowStep {
  id: string;
  type: 'trigger' | 'step';
  config: Record<string, any>;
  children: string[]; // List of children Nodes
  next: string; // ID of next Node
  position: { x: number; y: number };
  color: string;
  note: string;
}

export interface WorkflowExecutionHistoryModel {
  id: string;
  workflowId?: string;
  workflowName?: string;
  status: ExecutionStatus;
  startedAt: string;
  finishedAt: string;
  duration: number | null;
}

export interface WorkflowExecutionLogModel {
  timestamp: string;
  message: string;
  level: string;
}

export interface WorkflowExecutionModel {
  id: string;
  status: ExecutionStatus;
  startedAt: string;
  finishedAt: string;
  workflowId?: string;
  workflowName?: string;
  logs: WorkflowExecutionLogModel[];
}

// Full model - single source of truth
export interface WorkflowModel {
  id: string;
  name: string;
  description: string;
  status: WorkflowStatus;
  triggers: WorkflowTrigger[];
  tags: string[];
  yaml: string;
  definition: WorkflowStep[];
  executions: WorkflowExecutionModel[];
  history: WorkflowExecutionHistoryModel[];
  createdAt: string;
  createdBy: string;
  lastUpdatedAt: string;
  lastUpdatedBy: string;
}

export type WorkflowListItemModel = Pick<
  WorkflowModel,
  'id' | 'name' | 'description' | 'status' | 'triggers' | 'tags' | 'history'
>;

export interface WorkflowListModel {
  _pagination: {
    offset: number;
    limit: number;
    total: number;
    next?: string;
    prev?: string;
  };
  results: WorkflowListItemModel[];
}
