export interface EventEcs {
    action?: string[];
    category?: string[];
    code?: string[];
    created?: string[];
    dataset?: string[];
    duration?: number[];
    end?: string[];
    hash?: string[];
    id?: string[];
    kind?: string[];
    module?: string[];
    original?: string[];
    outcome?: string[];
    risk_score?: number[];
    risk_score_norm?: number[];
    severity?: number[];
    start?: string[];
    timezone?: string[];
    type?: string[];
}
export declare enum EventCode {
    MALICIOUS_FILE = "malicious_file",
    RANSOMWARE = "ransomware",
    MEMORY_SIGNATURE = "memory_signature",
    SHELLCODE_THREAD = "shellcode_thread",
    BEHAVIOR = "behavior"
}
export declare enum EventCategory {
    PROCESS = "process",
    FILE = "file",
    NETWORK = "network",
    REGISTRY = "registry",
    MALWARE = "malware"
}
