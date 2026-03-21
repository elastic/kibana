export interface ObservabilityIndexes {
    logs?: string;
    apm: {
        errors?: string;
        traces?: string;
    };
}
