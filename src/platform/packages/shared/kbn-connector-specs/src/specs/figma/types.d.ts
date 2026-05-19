export interface GetFileInput {
    fileKey: string;
    nodeIds?: string;
    depth?: number;
}
export interface RenderNodesInput {
    fileKey: string;
    nodeIds: string;
    format?: 'png' | 'jpg' | 'svg' | 'pdf';
    scale?: number;
}
export interface ListProjectFilesInput {
    projectId: string;
}
export interface ListTeamProjectsInput {
    teamId?: string;
    url?: string;
}
export interface WhoAmIResult {
    id?: string;
    handle?: string;
    email?: string;
    img_url?: string;
}
