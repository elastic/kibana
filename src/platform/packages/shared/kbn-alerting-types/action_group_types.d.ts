export interface ActionGroupSeverity {
    level: number;
}
export interface ActionGroup<ActionGroupIds extends string> {
    id: ActionGroupIds;
    name: string;
    severity?: ActionGroupSeverity;
}
