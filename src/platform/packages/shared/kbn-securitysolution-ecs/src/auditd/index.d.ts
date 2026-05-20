export interface AuditdEcs {
    result?: string[];
    session?: string[];
    data?: AuditdDataEcs;
    summary?: SummaryEcs;
    sequence?: string[];
}
export interface AuditdDataEcs {
    acct?: string[];
    terminal?: string[];
    op?: string[];
}
export interface SummaryEcs {
    actor?: PrimarySecondaryEcs;
    object?: PrimarySecondaryEcs;
    how?: string[];
    message_type?: string[];
    sequence?: string[];
}
export interface PrimarySecondaryEcs {
    primary?: string[];
    secondary?: string[];
    type?: string[];
}
