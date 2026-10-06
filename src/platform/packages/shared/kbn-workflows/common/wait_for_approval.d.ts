export declare const DEFAULT_WAIT_FOR_APPROVAL_APPROVE_LABEL: 'Approve';
export declare const DEFAULT_WAIT_FOR_APPROVAL_REJECT_LABEL: 'Decline';
export declare const DEFAULT_WAIT_FOR_APPROVAL_TIMEOUT: '24h';
export declare const WAIT_FOR_APPROVAL_RESPONSE_SCHEMA: {
    readonly type: 'object';
    readonly properties: {
        readonly approved: {
            readonly type: 'boolean';
            readonly description: 'Whether the request was approved';
        };
    };
    readonly required: ["approved"];
};
