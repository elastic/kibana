export interface ProfilingStatus {
    type?: 'cloud' | 'self-managed' | 'serverless';
    profiling_enabled: boolean;
    has_setup: boolean;
    has_data: boolean;
    pre_8_9_1_data: boolean;
    has_required_role?: boolean;
    unauthorized?: boolean;
}
