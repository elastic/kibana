/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as Rx from 'rxjs';
import type { FileJSON, BaseFilesClient as FilesClient } from '@kbn/shared-ux-file-types';

function naivelyFuzzify(query: string): string {
  return query.includes('*') ? query : `*${query}*`;
}

export class FilePickerState {
  /**
   * Files the user has selected
   */
  public readonly selectedFiles$ = new Rx.BehaviorSubject<FileJSON[]>([]);
  public readonly selectedFileIds$ = this.selectedFiles$.pipe(
    Rx.map((files) => files.map((file) => file.id))
  );

  public readonly isLoading$ = new Rx.BehaviorSubject<boolean>(true);
  public readonly loadingError$ = new Rx.BehaviorSubject<undefined | Error>(undefined);
  public readonly hasFiles$ = new Rx.BehaviorSubject<boolean>(false);
  public readonly hasQuery$ = new Rx.BehaviorSubject<boolean>(false);
  public readonly query$ = new Rx.BehaviorSubject<undefined | string>(undefined);
  public readonly queryDebounced$ = this.query$.pipe(Rx.debounceTime(100));
  public readonly currentPage$ = new Rx.BehaviorSubject<number>(0);
  public readonly totalPages$ = new Rx.BehaviorSubject<undefined | number>(undefined);
  public readonly isUploading$ = new Rx.BehaviorSubject<boolean>(false);
  public readonly deletePrompt$ = new Rx.BehaviorSubject<FileJSON | null>(null);

  private readonly selectedFiles = new Map<string, FileJSON>();
  private readonly retry$ = new Rx.BehaviorSubject<void>(undefined);
  private readonly subscriptions: Rx.Subscription[] = [];
  private readonly internalIsLoading$ = new Rx.BehaviorSubject<boolean>(true);

  constructor(
    private readonly client: FilesClient,
    private readonly kind: string,
    public readonly pageSize: number,
    private selectMultiple: boolean
  ) {
    this.subscriptions = [
      this.query$
        .pipe(
          Rx.map((query) => Boolean(query)),
          Rx.distinctUntilChanged()
        )
        .subscribe(this.hasQuery$),
      this.internalIsLoading$.pipe(Rx.distinctUntilChanged()).subscribe(this.isLoading$),
    ];
  }

  private readonly requests$ = Rx.combineLatest([
    this.currentPage$.pipe(Rx.distinctUntilChanged()),
    this.query$.pipe(Rx.distinctUntilChanged()),
    this.retry$,
  ]).pipe(
    Rx.tap(() => this.setIsLoading(true)), // set loading state as early as possible
    Rx.debounceTime(100)
  );

  /**
   * File objects we have loaded on the front end, stored here so that it can
   * easily be passed to all relevant UI.
   *
   * @note This is not explicitly kept in sync with the selected files!
   */
  public readonly files$ = this.requests$.pipe(
    Rx.switchMap(([page, query]) => this.sendRequest(page, query)),
    Rx.tap(({ total }) => this.updateTotalPages({ total })),
    Rx.tap(({ total }) => this.hasFiles$.next(Boolean(total))),
    Rx.map(({ files }) => files),
    Rx.shareReplay()
  );

  private updateTotalPages = ({ total }: { total: number }): void => {
    this.totalPages$.next(Math.ceil(total / this.pageSize));
  };

  private sendNextSelectedFiles() {
    this.selectedFiles$.next(Array.from(this.selectedFiles.values()));
  }

  private setIsLoading(value: boolean) {
    this.internalIsLoading$.next(value);
  }

  /**
   * If multiple selection is not configured, this will take the first file id
   * if an array of file ids was provided.
   */
  public selectFile = (file: FileJSON | FileJSON[]): void => {
    const files = Array.isArray(file) ? file : [file];
    if (!this.selectMultiple) {
      this.selectedFiles.clear();
      this.selectedFiles.set(files[0].id, files[0]);
    } else {
      for (const f of files) this.selectedFiles.set(f.id, f);
    }
    this.sendNextSelectedFiles();
  };

  private abort: undefined | (() => void) = undefined;
  private sendRequest = (
    page: number,
    query: undefined | string
  ): Rx.Observable<{ files: FileJSON[]; total: number }> => {
    if (this.isUploading$.getValue()) return Rx.EMPTY;
    if (this.abort) this.abort();
    this.setIsLoading(true);
    this.loadingError$.next(undefined);

    const abortController = new AbortController();
    this.abort = () => {
      try {
        abortController.abort();
      } catch (e) {
        // ignore
      }
    };

    const request$ = Rx.from(
      this.client.list({
        kind: this.kind,
        name: query ? [naivelyFuzzify(query)] : undefined,
        page: page + 1,
        status: ['READY'],
        perPage: this.pageSize,
        abortSignal: abortController.signal,
      })
    ).pipe(
      Rx.catchError((e) => {
        if (e.name !== 'AbortError') {
          this.setIsLoading(false);
          this.loadingError$.next(e);
        } else {
          // If the request was aborted, we assume another request is now in progress
        }
        return Rx.EMPTY;
      }),
      Rx.tap(() => {
        this.setIsLoading(false);
        this.abort = undefined;
      }),
      Rx.shareReplay()
    );

    request$.subscribe();

    return request$;
  };

  public retry = (): void => {
    this.retry$.next();
  };

  public resetFilters = (): void => {
    this.setQuery(undefined);
    this.setPage(0);
    this.retry();
  };

  public hasFilesSelected = (): boolean => {
    return this.selectedFiles.size > 0;
  };

  public unselectFile = (fileId: string): void => {
    if (this.selectedFiles.delete(fileId)) this.sendNextSelectedFiles();
  };

  public isFileIdSelected = (fileId: string): boolean => {
    return this.selectedFiles.has(fileId);
  };

  public getSelectedFileIds = (): string[] => {
    return Array.from(this.selectedFiles.keys());
  };

  public setQuery = (query: undefined | string): void => {
    if (query) this.query$.next(query);
    else this.query$.next(undefined);
    this.currentPage$.next(0);
  };

  public setPage = (page: number): void => {
    this.currentPage$.next(page);
  };

  public setIsUploading = (value: boolean): void => {
    this.isUploading$.next(value);
  };

  public dispose = (): void => {
    for (const sub of this.subscriptions) sub.unsubscribe();
  };

  public showDeletePrompt = (file: FileJSON): void => {
    this.deletePrompt$.next(file);
  };

  public hideDeletePrompt = (): void => {
    this.deletePrompt$.next(null);
  };

  public delete = async (file: FileJSON): Promise<void> => {
    await this.client.delete({ id: file.id, kind: file.fileKind });
  };

  watchFileSelected$ = (id: string): Rx.Observable<boolean> => {
    return this.selectedFiles$.pipe(
      Rx.map(() => this.selectedFiles.has(id)),
      Rx.distinctUntilChanged()
    );
  };
}

interface CreateFilePickerArgs {
  client: FilesClient;
  kind: string;
  pageSize: number;
  selectMultiple: boolean;
}
export const createFilePickerState = ({
  pageSize,
  client,
  kind,
  selectMultiple,
}: CreateFilePickerArgs): FilePickerState => {
  return new FilePickerState(client, kind, pageSize, selectMultiple);
};
