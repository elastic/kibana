export interface AlertDeletePreview {
    affectedAlertCount: number;
}
export interface AlertDeleteParams {
    activeAlertDeleteThreshold?: number;
    inactiveAlertDeleteThreshold?: number;
    categoryIds: Array<'securitySolution' | 'observability' | 'management'>;
}
export interface AlertDeleteLastRun {
    lastRun?: string;
}
