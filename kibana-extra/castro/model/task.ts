import { RepositoryUri } from './repository';

/** Time consuming task that should be queued and executed seperately */
export interface Task {
  repoUri: RepositoryUri;
  type: TaskType;
  /** Percentage of the task, 100 means task completed */
  progress: number;

  /** Revision of the repo that the task run on. May only apply to Index task */
  revision?: string;
}

export enum TaskType {
  Import, Update, Delete, Index
}