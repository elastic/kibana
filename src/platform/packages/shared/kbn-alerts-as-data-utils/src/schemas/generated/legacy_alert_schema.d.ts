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
export declare const LegacyAlertSchema: rt.IntersectionC<[rt.TypeC<{}>, rt.PartialC<{
    'ecs.version': rt.StringC;
    'kibana.alert.risk_score': rt.NumberC;
    'kibana.alert.rule.author': rt.StringC;
    'kibana.alert.rule.created_at': rt.UnionC<[rt.Type<string, string, unknown>, rt.NumberC]>;
    'kibana.alert.rule.created_by': rt.StringC;
    'kibana.alert.rule.description': rt.StringC;
    'kibana.alert.rule.enabled': rt.StringC;
    'kibana.alert.rule.from': rt.StringC;
    'kibana.alert.rule.interval': rt.StringC;
    'kibana.alert.rule.license': rt.StringC;
    'kibana.alert.rule.note': rt.StringC;
    'kibana.alert.rule.references': rt.ArrayC<rt.StringC>;
    'kibana.alert.rule.rule_id': rt.StringC;
    'kibana.alert.rule.rule_name_override': rt.StringC;
    'kibana.alert.rule.to': rt.StringC;
    'kibana.alert.rule.type': rt.StringC;
    'kibana.alert.rule.updated_at': rt.UnionC<[rt.Type<string, string, unknown>, rt.NumberC]>;
    'kibana.alert.rule.updated_by': rt.StringC;
    'kibana.alert.rule.version': rt.StringC;
    'kibana.alert.severity': rt.StringC;
    'kibana.alert.suppression.docs_count': rt.UnionC<[rt.StringC, rt.NumberC]>;
    'kibana.alert.suppression.end': rt.UnionC<[rt.Type<string, string, unknown>, rt.NumberC]>;
    'kibana.alert.suppression.start': rt.UnionC<[rt.Type<string, string, unknown>, rt.NumberC]>;
    'kibana.alert.suppression.terms.field': rt.ArrayC<rt.StringC>;
    'kibana.alert.suppression.terms.value': rt.ArrayC<rt.StringC>;
    'kibana.alert.system_status': rt.StringC;
    'kibana.alert.workflow_reason': rt.StringC;
    'kibana.alert.workflow_status_updated_at': rt.UnionC<[rt.Type<string, string, unknown>, rt.NumberC]>;
    'kibana.alert.workflow_user': rt.StringC;
}>]>;
export type LegacyAlert = rt.TypeOf<typeof LegacyAlertSchema>;
