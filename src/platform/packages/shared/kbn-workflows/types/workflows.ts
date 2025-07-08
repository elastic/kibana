export interface Tag {
  id: string;
  name: string;
}

// TODO: replace with a proper type, like in /src/core/packages/security/common/src/authentication/user.ts
export interface User {
  id: string;
  name: string;
  email: string;
}

// TODO: replace with a proper type, likely in the workflow-schema package
export interface WorkflowDefinition {
  steps: any[];
}

export interface WorkflowTrigger {
  id: string;
  type: 'manual' | 'schedule';
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  triggers: WorkflowTrigger[];
  tags: Tag[];
  enabled: boolean;
  definition: WorkflowDefinition;
  createdBy: User;
  createdAt: string;
  updatedAt: string;
}
