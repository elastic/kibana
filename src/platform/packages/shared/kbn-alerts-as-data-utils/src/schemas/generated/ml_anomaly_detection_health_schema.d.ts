import * as rt from 'io-ts';
export declare const IsoDateString: rt.Type<string, string, unknown>;
export type IsoDateStringC = typeof IsoDateString;
export declare const schemaUnknown: rt.UnknownC;
export declare const schemaUnknownArray: rt.ArrayC<rt.UnknownC>;
export declare const schemaString: rt.StringC;
export declare const schemaStringArray: rt.ArrayC<rt.StringC>;
export declare const schemaNumber: rt.NumberC;
export declare const schemaNumberArray: rt.ArrayC<rt.NumberC>;
export declare const schemaDate: rt.UnionC<[rt.Type<string, string, unknown>, rt.NumberC]>;
export declare const schemaDateArray: rt.ArrayC<rt.UnionC<[rt.Type<string, string, unknown>, rt.NumberC]>>;
export declare const schemaDateRange: rt.PartialC<{
    gte: rt.UnionC<[rt.Type<string, string, unknown>, rt.NumberC]>;
    lte: rt.UnionC<[rt.Type<string, string, unknown>, rt.NumberC]>;
}>;
export declare const schemaDateRangeArray: rt.ArrayC<rt.PartialC<{
    gte: rt.UnionC<[rt.Type<string, string, unknown>, rt.NumberC]>;
    lte: rt.UnionC<[rt.Type<string, string, unknown>, rt.NumberC]>;
}>>;
export declare const schemaStringOrNumber: rt.UnionC<[rt.StringC, rt.NumberC]>;
export declare const schemaStringOrNumberArray: rt.ArrayC<rt.UnionC<[rt.StringC, rt.NumberC]>>;
export declare const schemaBoolean: rt.BooleanC;
export declare const schemaBooleanArray: rt.ArrayC<rt.BooleanC>;
export declare const schemaGeoPoint: rt.UnionC<[rt.TypeC<{
    type: rt.StringC;
    coordinates: rt.ArrayC<rt.NumberC>;
}>, rt.StringC, rt.TypeC<{
    lat: rt.NumberC;
    lon: rt.NumberC;
}>, rt.TypeC<{
    location: rt.ArrayC<rt.NumberC>;
}>, rt.TypeC<{
    location: rt.StringC;
}>]>;
export declare const schemaGeoPointArray: rt.ArrayC<rt.UnionC<[rt.TypeC<{
    type: rt.StringC;
    coordinates: rt.ArrayC<rt.NumberC>;
}>, rt.StringC, rt.TypeC<{
    lat: rt.NumberC;
    lon: rt.NumberC;
}>, rt.TypeC<{
    location: rt.ArrayC<rt.NumberC>;
}>, rt.TypeC<{
    location: rt.StringC;
}>]>>;
export declare const MlAnomalyDetectionHealthAlertSchema: rt.IntersectionC<[rt.TypeC<{}>, rt.PartialC<{
    'kibana.alert.datafeed_results': rt.ArrayC<rt.PartialC<{
        datafeed_id: rt.StringC;
        datafeed_state: rt.StringC;
        job_id: rt.StringC;
        job_state: rt.StringC;
    }>>;
    'kibana.alert.delayed_data_results': rt.ArrayC<rt.PartialC<{
        annotation: rt.StringC;
        end_timestamp: rt.UnionC<[rt.Type<string, string, unknown>, rt.NumberC]>;
        job_id: rt.StringC;
        missed_docs_count: rt.UnionC<[rt.StringC, rt.NumberC]>;
    }>>;
    'kibana.alert.job_errors_results': rt.ArrayC<rt.PartialC<{
        errors: rt.UnknownC;
        job_id: rt.StringC;
    }>>;
    'kibana.alert.mml_results': rt.ArrayC<rt.PartialC<{
        job_id: rt.StringC;
        log_time: rt.UnionC<[rt.Type<string, string, unknown>, rt.NumberC]>;
        memory_status: rt.StringC;
        model_bytes: rt.UnionC<[rt.StringC, rt.NumberC]>;
        model_bytes_exceeded: rt.UnionC<[rt.StringC, rt.NumberC]>;
        model_bytes_memory_limit: rt.UnionC<[rt.StringC, rt.NumberC]>;
        peak_model_bytes: rt.UnionC<[rt.StringC, rt.NumberC]>;
    }>>;
}>, rt.IntersectionC<[rt.TypeC<{
    '@timestamp': rt.UnionC<[rt.Type<string, string, unknown>, rt.NumberC]>;
    'kibana.alert.instance.id': rt.StringC;
    'kibana.alert.rule.category': rt.StringC;
    'kibana.alert.rule.consumer': rt.StringC;
    'kibana.alert.rule.name': rt.StringC;
    'kibana.alert.rule.producer': rt.StringC;
    'kibana.alert.rule.revision': rt.UnionC<[rt.StringC, rt.NumberC]>;
    'kibana.alert.rule.rule_type_id': rt.StringC;
    'kibana.alert.rule.uuid': rt.StringC;
    'kibana.alert.status': rt.StringC;
    'kibana.alert.uuid': rt.StringC;
    'kibana.space_ids': rt.ArrayC<rt.StringC>;
}>, rt.PartialC<{
    'data_stream.dataset': rt.StringC;
    'data_stream.namespace': rt.StringC;
    'data_stream.type': rt.StringC;
    'event.action': rt.StringC;
    'event.kind': rt.StringC;
    'event.original': rt.StringC;
    'kibana.alert.action_group': rt.StringC;
    'kibana.alert.case_ids': rt.ArrayC<rt.StringC>;
    'kibana.alert.consecutive_matches': rt.UnionC<[rt.StringC, rt.NumberC]>;
    'kibana.alert.duration.us': rt.UnionC<[rt.StringC, rt.NumberC]>;
    'kibana.alert.end': rt.UnionC<[rt.Type<string, string, unknown>, rt.NumberC]>;
    'kibana.alert.flapping': rt.BooleanC;
    'kibana.alert.flapping_history': rt.ArrayC<rt.BooleanC>;
    'kibana.alert.index_pattern': rt.StringC;
    'kibana.alert.intended_timestamp': rt.UnionC<[rt.Type<string, string, unknown>, rt.NumberC]>;
    'kibana.alert.last_detected': rt.UnionC<[rt.Type<string, string, unknown>, rt.NumberC]>;
    'kibana.alert.maintenance_window_ids': rt.ArrayC<rt.StringC>;
    'kibana.alert.maintenance_window_names': rt.ArrayC<rt.StringC>;
    'kibana.alert.muted': rt.BooleanC;
    'kibana.alert.pending_recovered_count': rt.UnionC<[rt.StringC, rt.NumberC]>;
    'kibana.alert.previous_action_group': rt.StringC;
    'kibana.alert.reason': rt.StringC;
    'kibana.alert.rule.execution.timestamp': rt.UnionC<[rt.Type<string, string, unknown>, rt.NumberC]>;
    'kibana.alert.rule.execution.type': rt.StringC;
    'kibana.alert.rule.execution.uuid': rt.StringC;
    'kibana.alert.rule.parameters': rt.UnknownC;
    'kibana.alert.rule.tags': rt.ArrayC<rt.StringC>;
    'kibana.alert.scheduled_action.date': rt.StringC;
    'kibana.alert.scheduled_action.group': rt.StringC;
    'kibana.alert.severity': rt.StringC;
    'kibana.alert.severity_improving': rt.BooleanC;
    'kibana.alert.start': rt.UnionC<[rt.Type<string, string, unknown>, rt.NumberC]>;
    'kibana.alert.time_range': rt.PartialC<{
        gte: rt.UnionC<[rt.Type<string, string, unknown>, rt.NumberC]>;
        lte: rt.UnionC<[rt.Type<string, string, unknown>, rt.NumberC]>;
    }>;
    'kibana.alert.updated_at': rt.UnionC<[rt.Type<string, string, unknown>, rt.NumberC]>;
    'kibana.alert.updated_by.user.id': rt.StringC;
    'kibana.alert.updated_by.user.name': rt.StringC;
    'kibana.alert.url': rt.StringC;
    'kibana.alert.workflow_assignee_ids': rt.ArrayC<rt.StringC>;
    'kibana.alert.workflow_status': rt.StringC;
    'kibana.alert.workflow_tags': rt.ArrayC<rt.StringC>;
    'kibana.cps_scope.expression': rt.StringC;
    'kibana.cps_scope.linked_projects': rt.ArrayC<rt.UnknownC>;
    'kibana.version': rt.StringC;
    tags: rt.ArrayC<rt.StringC>;
}>]>]>;
export type MlAnomalyDetectionHealthAlert = rt.TypeOf<typeof MlAnomalyDetectionHealthAlertSchema>;
