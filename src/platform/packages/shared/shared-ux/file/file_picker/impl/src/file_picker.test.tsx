/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { act } from 'react-dom/test-utils';
import { registerTestBed } from '@kbn/test-jest-helpers';
import { FileUpload } from '@kbn/shared-ux-file-upload';
import { createMockFilesClient } from '@kbn/shared-ux-file-mocks';
import type { FileJSON } from '@kbn/shared-ux-file-types';
import { FilesContext } from '@kbn/shared-ux-file-context';
import { FilePicker, Props } from './file_picker';

describe('FilePicker', () => {
  const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));
  let client: ReturnType<typeof createMockFilesClient>;
  let onDone: jest.Mock;
  let onClose: jest.Mock;

  async function initTestBed(props?: Partial<Props>) {
    const createTestBed = registerTestBed((p: Props) => (
      <FilesContext client={client}>
        <FilePicker multiple {...p} />
      </FilesContext>
    ));

    const testBed = await createTestBed({
      client,
      kind: 'test',
      onClose,
      onDone,
      ...props,
    } as Props);

    const baseTestSubj = `filePickerModal`;

    const testSubjects = {
      base: baseTestSubj,
      searchField: `${baseTestSubj}.searchField`,
      emptyPrompt: `${baseTestSubj}.emptyPrompt`,
      errorPrompt: `${baseTestSubj}.errorPrompt`,
      selectButton: `${baseTestSubj}.selectButton`,
      loadingSpinner: `${baseTestSubj}.loadingSpinner`,
      fileGrid: `${baseTestSubj}.fileGrid`,
      paginationControls: `${baseTestSubj}.paginationControls`,
    };

    return {
      ...testBed,
      actions: {
        select: (n: number) =>
          act(() => {
            const file = testBed.find(testSubjects.fileGrid).childAt(n).find('button').first();
            file.simulate('click');
            testBed.component.update();
          }),
        done: () =>
          act(() => {
            testBed.find(testSubjects.selectButton).simulate('click');
          }),
        waitUntilLoaded: async () => {
          let tries = 5;
          while (tries) {
            await act(async () => {
              await sleep(100);
              testBed.component.update();
            });
            if (!testBed.exists(testSubjects.loadingSpinner)) {
              break;
            }
            --tries;
          }
        },
      },
      testSubjects,
    };
  }

  beforeEach(() => {
    jest.resetAllMocks();
    client = createMockFilesClient();
    client.getFileKind.mockImplementation(() => ({
      id: 'test',
      maxSizeBytes: 10000,
      http: {},
    }));
    onDone = jest.fn();
    onClose = jest.fn();
  });

  it('intially shows a loadings spinner, then content', async () => {
    client.list.mockImplementation(() => Promise.resolve({ files: [], total: 0 }));
    const { exists, testSubjects, actions } = await initTestBed();
    expect(exists(testSubjects.loadingSpinner)).toBe(true);
    await actions.waitUntilLoaded();
    expect(exists(testSubjects.loadingSpinner)).toBe(false);
  });
  it('shows empty prompt when there are no files', async () => {
    client.list.mockImplementation(() => Promise.resolve({ files: [], total: 0 }));
    const { exists, testSubjects, actions } = await initTestBed();
    await actions.waitUntilLoaded();
    expect(exists(testSubjects.emptyPrompt)).toBe(true);
  });
  it('returns the IDs of the selected files', async () => {
    client.list.mockImplementation(() =>
      Promise.resolve({ files: [{ id: 'a' }, { id: 'b' }] as FileJSON[], total: 2 })
    );
    const { find, testSubjects, actions } = await initTestBed();
    await actions.waitUntilLoaded();
    expect(find(testSubjects.selectButton).props().disabled).toBe(true);
    actions.select(0);
    actions.select(1);
    expect(find(testSubjects.selectButton).props().disabled).toBe(false);
    actions.done();
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(onDone).toHaveBeenNthCalledWith(1, [{ id: 'a' }, { id: 'b' }]);
  });
  it('hides pagination if there are no files', async () => {
    client.list.mockImplementation(() => Promise.resolve({ files: [] as FileJSON[], total: 2 }));
    const { actions, testSubjects, exists } = await initTestBed();
    await actions.waitUntilLoaded();
    expect(exists(testSubjects.paginationControls)).toBe(false);
  });
  describe('passes "meta" to <FileUpload />', () => {
    it('when empty', async () => {
      // Empty state
      const { component } = await initTestBed({ uploadMeta: { foo: 'bar' } });
      expect(component.find(FileUpload).props().meta).toEqual({ foo: 'bar' });
    });
    it('when there are files', async () => {
      const { component } = await initTestBed({ uploadMeta: { bar: 'baz' } });
      client.list.mockImplementation(() =>
        Promise.resolve({ files: [{ id: 'a' }, { id: 'b' }] as FileJSON[], total: 2 })
      );
      expect(component.find(FileUpload).props().meta).toEqual({ bar: 'baz' });
    });
  });
});
