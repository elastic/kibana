import * as Rx from 'rxjs';
import type { ImageMetadataFactory } from '@kbn/shared-ux-file-util';
import type { FileKindBrowser, FileJSON, BaseFilesClient as FilesClient } from '@kbn/shared-ux-file-types';
export interface FileState {
    file: File;
    status: 'idle' | 'uploading' | 'uploaded' | 'upload_failed';
    id?: string;
    fileJSON?: FileJSON;
    error?: Error;
}
export interface DoneNotification<Meta = unknown> {
    id: string;
    kind: string;
    fileJSON: FileJSON<Meta>;
}
interface UploadOptions {
    allowRepeatedUploads?: boolean;
}
export declare class UploadState {
    private readonly fileKind;
    private readonly client;
    private readonly opts;
    private readonly loadImageMetadata;
    private readonly abort$;
    private readonly files$$;
    readonly files$: Rx.Observable<FileState[]>;
    readonly clear$: Rx.Subject<void>;
    readonly error$: Rx.BehaviorSubject<Error | undefined>;
    readonly uploading$: Rx.BehaviorSubject<boolean>;
    readonly done$: Rx.Subject<DoneNotification<unknown>[] | undefined>;
    private subscriptions;
    constructor(fileKind: FileKindBrowser, client: FilesClient, opts?: UploadOptions, loadImageMetadata?: ImageMetadataFactory);
    isUploading(): boolean;
    private readonly validateFile;
    setFiles: (files: File[]) => void;
    abort: () => void;
    clear: () => void;
    /**
     * Do not throw from this method, it is intended to work with {@link forkJoin} from rxjs which
     * unsubscribes from all observables if one of them throws.
     */
    private uploadFile;
    upload: (meta?: unknown) => Rx.Observable<void>;
    dispose: () => void;
    hasFiles(): boolean;
}
export declare const createUploadState: ({ fileKind, client, imageMetadataFactory, ...options }: {
    fileKind: FileKindBrowser;
    client: FilesClient;
    imageMetadataFactory?: ImageMetadataFactory;
} & UploadOptions) => UploadState;
export {};
