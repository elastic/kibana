/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as Rx from 'rxjs';
import { ImageMetadataFactory, getImageMetadata, isImage } from '@kbn/shared-ux-file-util';
import type { FileKind, FileJSON, BaseFilesClient as FilesClient } from '@kbn/shared-ux-file-types';
import { i18nTexts } from './i18n_texts';

import { createStateSubject, type SimpleStateSubject, parseFileName } from './util';

interface FileState {
  file: File;
  status: 'idle' | 'uploading' | 'uploaded' | 'upload_failed';
  id?: string;
  fileJSON?: FileJSON;
  error?: Error;
}

type Upload = SimpleStateSubject<FileState>;

export interface DoneNotification<Meta = unknown> {
  id: string;
  kind: string;
  fileJSON: FileJSON<Meta>;
}

interface UploadOptions {
  allowRepeatedUploads?: boolean;
}

export class UploadState {
  private readonly abort$ = new Rx.Subject<void>();
  private readonly files$$ = new Rx.BehaviorSubject<Upload[]>([]);

  public readonly files$ = this.files$$.pipe(
    Rx.switchMap((files$) => (files$.length ? Rx.zip(...files$) : Rx.of([])))
  );
  public readonly clear$ = new Rx.Subject<void>();
  public readonly error$ = new Rx.BehaviorSubject<undefined | Error>(undefined);
  public readonly uploading$ = new Rx.BehaviorSubject(false);
  public readonly done$ = new Rx.Subject<undefined | DoneNotification[]>();

  private subscriptions: Rx.Subscription[];

  constructor(
    private readonly fileKind: FileKind,
    private readonly client: FilesClient,
    private readonly opts: UploadOptions = { allowRepeatedUploads: false },
    private readonly loadImageMetadata: ImageMetadataFactory = getImageMetadata
  ) {
    const latestFiles$ = this.files$$.pipe(Rx.switchMap((files$) => Rx.combineLatest(files$)));
    this.subscriptions = [
      latestFiles$
        .pipe(
          Rx.map((files) => files.some((file) => file.status === 'uploading')),
          Rx.distinctUntilChanged()
        )
        .subscribe(this.uploading$),

      latestFiles$
        .pipe(
          Rx.map((files) => {
            const errorFile = files.find((file) => Boolean(file.error));
            return errorFile ? errorFile.error : undefined;
          }),
          Rx.filter(Boolean)
        )
        .subscribe(this.error$),

      latestFiles$
        .pipe(
          Rx.filter(
            (files) => Boolean(files.length) && files.every((file) => file.status === 'uploaded')
          ),
          Rx.map((files) =>
            files.map((file) => ({
              id: file.id!,
              kind: this.fileKind.id,
              fileJSON: file.fileJSON!,
            }))
          )
        )
        .subscribe(this.done$),
    ];
  }

  public isUploading(): boolean {
    return this.uploading$.getValue();
  }

  private validateFiles(files: File[]): undefined | string {
    if (
      this.fileKind.maxSizeBytes != null &&
      files.some((file) => file.size > this.fileKind.maxSizeBytes!)
    ) {
      return i18nTexts.fileTooLarge(String(this.fileKind.maxSizeBytes));
    }
    return;
  }

  public setFiles = (files: File[]): void => {
    if (this.isUploading()) {
      throw new Error('Cannot update files while uploading');
    }

    if (!files.length) {
      this.done$.next(undefined);
      this.error$.next(undefined);
    }

    const validationError = this.validateFiles(files);

    this.files$$.next(
      files.map((file) =>
        createStateSubject<FileState>({
          file,
          status: 'idle',
          error: validationError ? new Error(validationError) : undefined,
        })
      )
    );
  };

  public abort = (): void => {
    if (!this.isUploading()) {
      throw new Error('No upload in progress');
    }
    this.abort$.next();
  };

  clear = (): void => {
    this.setFiles([]);
    this.clear$.next();
  };

  /**
   * Do not throw from this method, it is intended to work with {@link forkJoin} from rxjs which
   * unsubscribes from all observables if one of them throws.
   */
  private uploadFile = (
    file$: SimpleStateSubject<FileState>,
    abort$: Rx.Observable<void>,
    meta?: unknown
  ): Rx.Observable<void | Error> => {
    const abortController = new AbortController();
    const abortSignal = abortController.signal;
    const { file, status } = file$.getValue();
    if (!['idle', 'upload_failed'].includes(status)) {
      return Rx.of(undefined);
    }

    let uploadTarget: undefined | FileJSON;

    file$.setState({ status: 'uploading', error: undefined });

    const { name } = parseFileName(file.name);
    const mime = file.type || undefined;
    const _meta = meta as Record<string, unknown>;

    return Rx.from(isImage(file) ? this.loadImageMetadata(file) : Rx.of(undefined)).pipe(
      Rx.mergeMap((imageMetadata) =>
        this.client.create({
          kind: this.fileKind.id,
          name,
          mimeType: mime,
          meta: imageMetadata ? { ...imageMetadata, ..._meta } : _meta,
        })
      ),
      Rx.mergeMap((result) => {
        uploadTarget = result.file;
        return Rx.race(
          abort$.pipe(
            Rx.map(() => {
              abortController.abort();
              throw new Error('Abort!');
            })
          ),
          this.client.upload({
            body: file,
            id: uploadTarget.id,
            kind: this.fileKind.id,
            abortSignal,
            selfDestructOnAbort: true,
            contentType: mime,
          })
        );
      }),
      Rx.map(() => {
        file$.setState({ status: 'uploaded', id: uploadTarget?.id, fileJSON: uploadTarget });
      }),
      Rx.catchError((e) => {
        const isAbortError = e.message === 'Abort!';
        file$.setState({ status: 'upload_failed', error: isAbortError ? undefined : e });
        return Rx.of(isAbortError ? undefined : e);
      })
    );
  };

  public upload = (meta?: unknown): Rx.Observable<void> => {
    if (this.isUploading()) {
      throw new Error('Upload already in progress');
    }
    const abort$ = new Rx.ReplaySubject<void>(1);
    const sub = this.abort$.subscribe(abort$);
    const upload$ = this.files$$.pipe(
      Rx.take(1),
      Rx.switchMap((files$) =>
        Rx.forkJoin(files$.map((file$) => this.uploadFile(file$, abort$, meta)))
      ),
      Rx.map(() => undefined),
      Rx.finalize(() => {
        if (this.opts.allowRepeatedUploads) this.clear();
        sub.unsubscribe();
      }),
      Rx.shareReplay()
    );

    upload$.subscribe(); // Kick off the upload

    return upload$;
  };

  public dispose = (): void => {
    for (const sub of this.subscriptions) sub.unsubscribe();
  };

  public hasFiles(): boolean {
    return this.files$$.getValue().length > 0;
  }
}

export const createUploadState = ({
  fileKind,
  client,
  imageMetadataFactory,
  ...options
}: {
  fileKind: FileKind;
  client: FilesClient;
  imageMetadataFactory?: ImageMetadataFactory;
} & UploadOptions) => {
  return new UploadState(fileKind, client, options, imageMetadataFactory);
};
