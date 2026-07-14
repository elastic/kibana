export declare const deleteFiles: ({ filesToDelete }: {
    filesToDelete: string[];
}) => Promise<void>;
export type GetFileInfoResult = {
    exist: false;
} | {
    exist: true;
    size: number;
    mtime: Date;
};
export declare const getFileInfo: (absFilePath: string) => Promise<GetFileInfoResult>;
