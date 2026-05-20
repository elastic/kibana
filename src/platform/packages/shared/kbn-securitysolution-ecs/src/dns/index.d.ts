export interface DnsEcs {
    question?: DnsQuestionEcs;
    resolved_ip?: string[];
    response_code?: string[];
}
export interface DnsQuestionEcs {
    name?: string[];
    type?: string[];
}
