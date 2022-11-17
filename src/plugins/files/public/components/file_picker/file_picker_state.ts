/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  map,
  tap,
  from,
  EMPTY,
  switchMap,
  catchError,
  Observable,
  shareReplay,
  debounceTime,
  Subscription,
  combineLatest,
  BehaviorSubject,
  distinctUntilChanged,
} from 'rxjs';
import type { FileJSON } from '../../../common';
import type { FilesClient } from '../../types';

function naivelyFuzzify(query: string): string {
  return query.includes('*') ? query : `*${query}*`;
}

export class FilePickerState {
  /**
   * Files the user has selected
   */
  public readonly selectedFiles$ = new BehaviorSubject<FileJSON[]>([]);
  public readonly selectedFileIds$ = this.selectedFiles$.pipe(
    map((files) => files.map((file) => file.id))
  );

  public readonly isLoading$ = new BehaviorSubject<boolean>(true);
  public readonly loadingError$ = new BehaviorSubject<undefined | Error>(undefined);
  public readonly hasFiles$ = new BehaviorSubject<boolean>(false);
  public readonly hasQuery$ = new BehaviorSubject<boolean>(false);
  public readonly query$ = new BehaviorSubject<undefined | string>(undefined);
  public readonly queryDebounced$ = this.query$.pipe(debounceTime(100));
  public readonly currentPage$ = new BehaviorSubject<number>(0);
  public readonly totalPages$ = new BehaviorSubject<undefined | number>(undefined);
  public readonly isUploading$ = new BehaviorSubject<boolean>(false);

  private readonly selectedFiles = new Map<string, FileJSON>();
  private readonly retry$ = new BehaviorSubject<void>(undefined);
  private readonly subscriptions: Subscription[] = [];
  private readonly internalIsLoading$ = new BehaviorSubject<boolean>(true);

  constructor(
    private readonly client: FilesClient,
    private readonly kind: string,
    public readonly pageSize: number,
    private selectMultiple: boolean
  ) {
    this.subscriptions = [
      this.query$
        .pipe(
          map((query) => Boolean(query)),
          distinctUntilChanged()
        )
        .subscribe(this.hasQuery$),
      this.internalIsLoading$.pipe(distinctUntilChanged()).subscribe(this.isLoading$),
    ];
  }

  private readonly requests$ = combineLatest([
    this.currentPage$.pipe(distinctUntilChanged()),
    this.query$.pipe(distinctUntilChanged()),
    this.retry$,
  ]).pipe(
    tap(() => this.setIsLoading(true)), // set loading state as early as possible
    debounceTime(100)
  );

  /**
   * File objects we have loaded on the front end, stored here so that it can
   * easily be passed to all relevant UI.
   *
   * @note This is not explicitly kept in sync with the selected files!
   */
  public readonly files$ = this.requests$.pipe(
    switchMap(([page, query]) => this.sendRequest(page, query)),
    tap(({ total }) => this.updateTotalPages({ total })),
    tap(({ total }) => this.hasFiles$.next(Boolean(total))),
    map(({ files }) => files),
    shareReplay()
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
  ): Observable<{ files: FileJSON[]; total: number }> => {
    if (this.isUploading$.getValue()) return EMPTY;
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

    const request$ = from(
      this.client.list({
        kind: this.kind,
        name: query ? [naivelyFuzzify(query)] : undefined,
        page: page + 1,
        status: ['READY'],
        perPage: this.pageSize,
        abortSignal: abortController.signal,
      })
    ).pipe(
      catchError((e) => {
        if (e.name !== 'AbortError') {
          this.setIsLoading(false);
          this.loadingError$.next(e);
        } else {
          // If the request was aborted, we assume another request is now in progress
        }
        return EMPTY;
      }),
      tap(() => {
        this.setIsLoading(false);
        this.abort = undefined;
      }),
      shareReplay()
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

  watchFileSelected$ = (id: string): Observable<boolean> => {
    return this.selectedFiles$.pipe(
      map(() => this.selectedFiles.has(id)),
      distinctUntilChanged()
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
