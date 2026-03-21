export interface AlertRuleFromVisUIActionData {
    query: string | null;
    thresholdValues: Array<{
        values: Record<string, number | string>;
        yField: string;
    }>;
    xValues: Record<string, string | number | null | undefined>;
    usesPlaceholderValues?: boolean;
}
