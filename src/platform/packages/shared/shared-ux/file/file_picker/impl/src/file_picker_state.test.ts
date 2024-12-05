/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

jest.mock('rxjs', () => {
  const rxjs = jest.requireActual('rxjs');
  return {
    ...rxjs,
    debounceTime: rxjs.tap,
  };
});

import { TestScheduler } from 'rxjs/testing';
import { merge, tap, of, NEVER } from 'rxjs';
import { FileJSON } from '@kbn/shared-ux-file-types';
import { createMockFilesClient } from '@kbn/shared-ux-file-mocks';
import { FilePickerState, createFilePickerState } from './file_picker_state';

const getTestScheduler = () =>
  new TestScheduler((actual, expected) => expect(actual).toEqual(expected));

describe('FilePickerState', () => {
  let filePickerState: FilePickerState;
  let filesClient: ReturnType<typeof createMockFilesClient>;
  beforeEach(() => {
    filesClient = createMockFilesClient();
    filePickerState = createFilePickerState({
      client: filesClient,
      pageSize: 20,
      kind: 'test',
      selectMultiple: true,
    });
  });
  it('starts off empty', () => {
    expect(filePickerState.hasFilesSelected()).toBe(false);
  });
  it('updates when files are added', () => {
    getTestScheduler().run(({ expectObservable, cold, flush }) => {
      const addFiles$ = cold('--a-b|').pipe(
        tap((id) => filePickerState.selectFile({ id } as FileJSON))
      );
      expectObservable(addFiles$).toBe('--a-b|');
      expectObservable(filePickerState.selectedFileIds$).toBe('a-b-c-', {
        a: [],
        b: ['a'],
        c: ['a', 'b'],
      });
      flush();
      expect(filePickerState.hasFilesSelected()).toBe(true);
      expect(filePickerState.getSelectedFileIds()).toEqual(['a', 'b']);
    });
  });
  it('adds files simultaneously as one update', () => {
    getTestScheduler().run(({ expectObservable, cold, flush }) => {
      const addFiles$ = cold('--a|').pipe(
        tap(() => filePickerState.selectFile([{ id: '1' }, { id: '2' }, { id: '3' }] as FileJSON[]))
      );
      expectObservable(addFiles$).toBe('--a|');
      expectObservable(filePickerState.selectedFileIds$).toBe('a-b-', {
        a: [],
        b: ['1', '2', '3'],
      });
      flush();
      expect(filePickerState.hasFilesSelected()).toBe(true);
      expect(filePickerState.getSelectedFileIds()).toEqual(['1', '2', '3']);
    });
  });
  it('updates when files are removed', () => {
    getTestScheduler().run(({ expectObservable, cold, flush }) => {
      const addFiles$ = cold('   --a-b---c|').pipe(
        tap((id) => filePickerState.selectFile({ id } as FileJSON))
      );
      const removeFiles$ = cold('------a|').pipe(tap((id) => filePickerState.unselectFile(id)));
      expectObservable(merge(addFiles$, removeFiles$)).toBe('--a-b-a-c|');
      expectObservable(filePickerState.selectedFileIds$).toBe('a-b-c-d-e-', {
        a: [],
        b: ['a'],
        c: ['a', 'b'],
        d: ['b'],
        e: ['b', 'c'],
      });
      flush();
      expect(filePickerState.hasFilesSelected()).toBe(true);
      expect(filePickerState.getSelectedFileIds()).toEqual(['b', 'c']);
    });
  });
  it('does not add duplicates', () => {
    getTestScheduler().run(({ expectObservable, cold, flush }) => {
      const addFiles$ = cold('--a-b-a-a-a|').pipe(
        tap((id) => filePickerState.selectFile({ id } as FileJSON))
      );
      expectObservable(addFiles$).toBe('--a-b-a-a-a|');
      expectObservable(filePickerState.selectedFileIds$).toBe('a-b-c-d-e-f-', {
        a: [],
        b: ['a'],
        c: ['a', 'b'],
        d: ['a', 'b'],
        e: ['a', 'b'],
        f: ['a', 'b'],
      });
      flush();
      expect(filePickerState.hasFilesSelected()).toBe(true);
      expect(filePickerState.getSelectedFileIds()).toEqual(['a', 'b']);
    });
  });
  it('calls the API with the expected args', () => {
    getTestScheduler().run(({ expectObservable, cold, flush }) => {
      const files = [
        { id: 'a', name: 'a' },
        { id: 'b', name: 'b' },
      ] as FileJSON[];
      filesClient.list.mockImplementation(() => of({ files }) as any);

      const inputQuery = '-------a---b|';
      const inputPage = ' ---------------2|';

      const query$ = cold(inputQuery).pipe(tap((q) => filePickerState.setQuery(q)));
      expectObservable(query$).toBe(inputQuery);

      const page$ = cold(inputPage).pipe(tap((p) => filePickerState.setPage(+p)));
      expectObservable(page$).toBe(inputPage);

      expectObservable(filePickerState.files$, '----^').toBe('----a--b---c---d', {
        a: files,
        b: files,
        c: files,
        d: files,
      });

      flush();
      expect(filesClient.list).toHaveBeenCalledTimes(4);
      expect(filesClient.list).toHaveBeenNthCalledWith(1, {
        abortSignal: expect.any(AbortSignal),
        kind: 'test',
        name: undefined,
        page: 1,
        perPage: 20,
        status: ['READY'],
      });
      expect(filesClient.list).toHaveBeenNthCalledWith(2, {
        abortSignal: expect.any(AbortSignal),
        kind: 'test',
        name: ['*a*'],
        page: 1,
        perPage: 20,
        status: ['READY'],
      });
      expect(filesClient.list).toHaveBeenNthCalledWith(3, {
        abortSignal: expect.any(AbortSignal),
        kind: 'test',
        name: ['*b*'],
        page: 1,
        perPage: 20,
        status: ['READY'],
      });
      expect(filesClient.list).toHaveBeenNthCalledWith(4, {
        abortSignal: expect.any(AbortSignal),
        kind: 'test',
        name: ['*b*'],
        page: 3,
        perPage: 20,
        status: ['READY'],
      });
    });
  });
  it('cancels in flight requests', () => {
    getTestScheduler().run(({ expectObservable, cold }) => {
      filesClient.list.mockImplementationOnce(() => NEVER as any);
      filesClient.list.mockImplementationOnce(() => of({ files: [], total: 0 }) as any);
      const inputQuery = '------a|';
      const input$ = cold(inputQuery).pipe(tap((q) => filePickerState.setQuery(q)));
      expectObservable(input$).toBe(inputQuery);
      expectObservable(filePickerState.files$, '--^').toBe('------a-', { a: [] });
      expectObservable(filePickerState.loadingError$).toBe('a-b---c-', {});
    });
  });
  it('does not allow fetching files while an upload is in progress', () => {
    getTestScheduler().run(({ expectObservable, cold }) => {
      const files = [] as FileJSON[];
      filesClient.list.mockImplementation(() => of({ files }) as any);
      const uploadInput = '---a|';
      const queryInput = ' -----a|';
      const upload$ = cold(uploadInput).pipe(tap(() => filePickerState.setIsUploading(true)));
      const query$ = cold(queryInput).pipe(tap((q) => filePickerState.setQuery(q)));
      expectObservable(merge(upload$, query$)).toBe('---a-a|');
      expectObservable(filePickerState.files$).toBe('a------', { a: [] });
    });
  });
  describe('single selection', () => {
    beforeEach(() => {
      filePickerState = createFilePickerState({
        client: filesClient,
        pageSize: 20,
        kind: 'test',
        selectMultiple: false,
      });
    });
    it('allows only one file to be selected', () => {
      filePickerState.selectFile({ id: 'a' } as FileJSON);
      expect(filePickerState.getSelectedFileIds()).toEqual(['a']);
      filePickerState.selectFile([{ id: 'b' }, { id: 'a' }, { id: 'c' }] as FileJSON[]);
      expect(filePickerState.getSelectedFileIds()).toEqual(['b']);
    });
  });
});
