export declare const DEFAULT_WAIT_FOR_APPROVAL_APPROVE_LABEL: "Approve";
export declare const DEFAULT_WAIT_FOR_APPROVAL_REJECT_LABEL: "Decline";
export declare const DEFAULT_WAIT_FOR_APPROVAL_TIMEOUT: "24h";
export declare const WAIT_FOR_APPROVAL_RESPONSE_SCHEMA: {
    readonly type: "object";
    readonly properties: {
        readonly approved: {
            readonly type: "boolean";
            readonly description: "Whether the request was approved";
        };
    };
    readonly required: ["approved"];
};
export type HitlWaitStepType = 'waitForInput' | 'waitForApproval';
/** Maps `with.channels` keys to Kibana connector action types for connector-id autocomplete/validation. */
export declare const WAIT_FOR_APPROVAL_CHANNEL_CONNECTOR_TYPES: {
    readonly slack: "slack";
    readonly slack_api: "slack_api";
};
export type WaitForApprovalChannelKey = keyof typeof WAIT_FOR_APPROVAL_CHANNEL_CONNECTOR_TYPES;
export declare const isHitlWaitStepType: (stepType: string | undefined) => stepType is HitlWaitStepType;
