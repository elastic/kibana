export interface RetryStepState extends Record<string, unknown> {
    attempt: number;
    resumeAt?: string;
}
