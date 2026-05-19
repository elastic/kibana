export declare const legacyAlertFieldMap: {
    readonly "kibana.alert.risk_score": {
        readonly type: "float";
        readonly array: false;
        readonly required: false;
    };
    readonly "kibana.alert.rule.author": {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly "kibana.alert.rule.created_at": {
        readonly type: "date";
        readonly array: false;
        readonly required: false;
    };
    readonly "kibana.alert.rule.created_by": {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly "kibana.alert.rule.description": {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly "kibana.alert.rule.enabled": {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly "kibana.alert.rule.from": {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly "kibana.alert.rule.interval": {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly "kibana.alert.rule.license": {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly "kibana.alert.rule.note": {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly "kibana.alert.rule.references": {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly "kibana.alert.rule.rule_id": {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly "kibana.alert.rule.rule_name_override": {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly "kibana.alert.rule.to": {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly "kibana.alert.rule.type": {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly "kibana.alert.rule.updated_at": {
        readonly type: "date";
        readonly array: false;
        readonly required: false;
    };
    readonly "kibana.alert.rule.updated_by": {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly "kibana.alert.rule.version": {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly "kibana.alert.severity": {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly "kibana.alert.suppression.docs_count": {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly "kibana.alert.suppression.end": {
        readonly type: "date";
        readonly array: false;
        readonly required: false;
    };
    readonly "kibana.alert.suppression.terms.field": {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly "kibana.alert.suppression.start": {
        readonly type: "date";
        readonly array: false;
        readonly required: false;
    };
    readonly "kibana.alert.suppression.terms.value": {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly "kibana.alert.system_status": {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly "kibana.alert.workflow_reason": {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly "kibana.alert.workflow_user": {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly "kibana.alert.workflow_status_updated_at": {
        readonly type: "date";
        readonly array: false;
        readonly required: false;
    };
    readonly "ecs.version": {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
        readonly ignore_above: 1024;
    };
};
export type LegacyAlertFieldMap = typeof legacyAlertFieldMap;
