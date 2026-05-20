import type { DataTableRecord } from '../../types';
export interface TraceFields {
    'service.name'?: string;
    'event.outcome'?: string;
    'transaction.name'?: string;
    'transaction.duration.us'?: string;
    'span.name'?: string;
    'span.duration.us'?: string;
    'agent.name'?: string;
}
export interface TraceDocument extends DataTableRecord {
    flattened: {
        '@timestamp': string;
        'log.level'?: [string];
        message?: [string];
        'error.message'?: string;
        'event.original'?: string;
        'host.name'?: string;
        'service.name'?: string;
        'trace.id': string;
        'agent.name'?: string;
        'orchestrator.cluster.name'?: string;
        'orchestrator.cluster.id'?: string;
        'orchestrator.resource.id'?: string;
        'orchestrator.namespace'?: string;
        'container.name'?: string;
        'container.id'?: string;
        'cloud.provider'?: string;
        'cloud.region'?: string;
        'cloud.availability_zone'?: string;
        'cloud.project.id'?: string;
        'cloud.instance.id'?: string;
        'log.file.path'?: string;
        'data_stream.namespace': string;
        'data_stream.dataset': string;
        'error.stack_trace'?: string;
        'error.exception.stacktrace.abs_path'?: string;
        'error.log.stacktrace.abs_path'?: string;
        'event.outcome'?: string;
        'transaction.name'?: string;
        'transaction.duration.us'?: string;
        'span.name'?: string;
        'span.duration.us'?: string;
    };
}
