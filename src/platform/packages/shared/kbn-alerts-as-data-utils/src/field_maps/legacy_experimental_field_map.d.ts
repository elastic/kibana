export declare const legacyExperimentalFieldMap: {
    readonly "kibana.alert.evaluation.threshold": {
        readonly type: "scaled_float";
        readonly scaling_factor: 100;
        readonly required: false;
    };
    readonly "kibana.alert.evaluation.time_range": {
        readonly type: "date_range";
        readonly array: false;
        readonly required: false;
    };
    readonly "kibana.alert.evaluation.value": {
        readonly type: "scaled_float";
        readonly scaling_factor: 100;
        readonly required: false;
    };
    readonly "kibana.alert.context": {
        readonly type: "object";
        readonly array: false;
        readonly required: false;
    };
    readonly "kibana.alert.evaluation.values": {
        readonly type: "scaled_float";
        readonly scaling_factor: 100;
        readonly required: false;
        readonly array: true;
    };
    readonly "kibana.alert.grouping": {
        readonly type: "object";
        readonly dynamic: true;
        readonly array: false;
        readonly required: false;
    };
    readonly "kibana.alert.group": {
        readonly type: "object";
        readonly array: true;
        readonly required: false;
    };
    readonly "kibana.alert.group.field": {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly "kibana.alert.group.value": {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
};
export type ExperimentalRuleFieldMap = typeof legacyExperimentalFieldMap;
