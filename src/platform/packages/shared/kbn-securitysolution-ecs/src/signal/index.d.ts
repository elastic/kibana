import type { RuleEcs } from '../rule';
export interface SignalEcs {
    rule?: RuleEcs;
    original_time?: string[];
    status?: string[];
    group?: {
        id?: string[];
    };
    threshold_result?: unknown;
}
export type SignalEcsAAD = Exclude<SignalEcs, 'rule' | 'status'> & {
    rule?: Exclude<RuleEcs, 'id'> & {
        parameters: Record<string, unknown>;
        uuid: string[];
    };
    severity?: string[];
    building_block_type?: string[];
    workflow_status?: string[];
    workflow_tags?: string[];
    workflow_assignee_ids?: string[];
    suppression?: {
        docs_count: string[];
    };
    ancestors?: {
        index?: string;
    };
};
