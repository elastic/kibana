import type { RangeFilterParams } from '../../filters';
import type { KueryNode } from '../types';
export declare const nodeBuilder: {
    is: (fieldName: string, value: string | KueryNode) => KueryNode;
    or: (nodes: KueryNode[]) => KueryNode;
    and: (nodes: KueryNode[]) => KueryNode;
    range: (fieldName: string, operator: keyof Pick<RangeFilterParams, "gt" | "gte" | "lt" | "lte">, value: number | string) => KueryNode;
};
