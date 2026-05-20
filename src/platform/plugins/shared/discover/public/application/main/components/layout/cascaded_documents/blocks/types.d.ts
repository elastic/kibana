export interface ESQLDataGroupNode {
    id: string;
    groupColumn: string;
    groupValue: string;
    aggregatedValues: Record<string, number | string[] | undefined>;
}
