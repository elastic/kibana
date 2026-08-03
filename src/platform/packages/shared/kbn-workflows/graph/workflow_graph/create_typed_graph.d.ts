import type { WorkflowGraphType } from '../types';
export declare function createTypedGraph(opt?: {
    directed?: boolean;
    multigraph?: boolean;
    compound?: boolean;
}): WorkflowGraphType;
