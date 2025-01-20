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
import { EuiFilePicker } from '@elastic/eui';
import { FilesContext } from '@kbn/shared-ux-file-context';
import type { FileJSON } from '@kbn/shared-ux-file-types';
import { createMockFilesClient } from '@kbn/shared-ux-file-mocks';
import { FileUpload, Props } from './file_upload';

describe('FileUpload', () => {
  const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));
  let onDone: jest.Mock;
  let onError: jest.Mock;
  let client: ReturnType<typeof createMockFilesClient>;

  async function initTestBed(props?: Partial<Props>) {
    const createTestBed = registerTestBed((p: Props) => (
      <FilesContext client={client}>
        <FileUpload {...p} />
      </FilesContext>
    ));

    const testBed = await createTestBed({
      kind: 'test',
      onDone,
      onError,
      ...props,
    });

    const baseTestSubj = `filesFileUpload`;

    const testSubjects = {
      base: baseTestSubj,
      uploadButton: `${baseTestSubj}.uploadButton`,
      retryButton: `${baseTestSubj}.retryButton`,
      cancelButton: `${baseTestSubj}.cancelButton`,
      cancelButtonIcon: `${baseTestSubj}.cancelButtonIcon`,
      errorMessage: `${baseTestSubj}.error`,
    };

    return {
      ...testBed,
      actions: {
        addFiles: (files: File[]) =>
          act(async () => {
            testBed.component.find(EuiFilePicker).props().onChange!(files as unknown as FileList);
            await sleep(1);
            testBed.component.update();
          }),
        upload: (retry = false) =>
          act(async () => {
            testBed
              .find(retry ? testSubjects.retryButton : testSubjects.uploadButton)
              .simulate('click');
            await sleep(1);
            testBed.component.update();
          }),
        abort: () =>
          act(() => {
            testBed.find(testSubjects.cancelButton).simulate('click');
            testBed.component.update();
          }),
        wait: (ms: number) =>
          act(async () => {
            await sleep(ms);
            testBed.component.update();
          }),
      },
      testSubjects,
    };
  }

  beforeEach(() => {
    client = createMockFilesClient();
    client.getFileKind.mockImplementation(() => ({
      id: 'test',
      maxSizeBytes: 10000,
      http: {},
    }));
    onDone = jest.fn();
    onError = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('shows the success message when upload completes', async () => {
    client.create.mockResolvedValue({ file: { id: 'test', size: 1 } as FileJSON });
    client.upload.mockResolvedValue({ size: 1, ok: true });

    const { actions, find, exists, testSubjects } = await initTestBed();
    await actions.addFiles([{ name: 'test', size: 1 } as File]);
    await actions.upload();
    await sleep(1000);
    expect(exists(testSubjects.errorMessage)).toBe(false);
    expect(find(testSubjects.uploadButton).text()).toMatch(/upload complete/i);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('does not show the upload button for "immediate" uploads', async () => {
    client.create.mockResolvedValue({ file: { id: 'test' } as FileJSON });
    client.upload.mockImplementation(() => sleep(100).then(() => ({ ok: true, size: 1 })));

    const { actions, exists, testSubjects } = await initTestBed({ onDone, immediate: true });
    expect(exists(testSubjects.uploadButton)).toBe(false);
    await actions.addFiles([{ name: 'test', size: 1 } as File]);
    expect(exists(testSubjects.uploadButton)).toBe(false);
    await actions.wait(100);

    expect(onDone).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();
  });

  it('allows users to cancel uploads', async () => {
    client.create.mockResolvedValue({ file: { id: 'test' } as FileJSON });
    client.upload.mockImplementation(() => sleep(1000).then(() => ({ ok: true, size: 1 })));

    const { actions, testSubjects, find } = await initTestBed();
    await actions.addFiles([{ name: 'test', size: 1 } as File]);
    await actions.upload();
    expect(find(testSubjects.cancelButton).props().disabled).toBe(false);
    actions.abort();

    await sleep(1000);

    expect(onDone).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });

  it('does not show error messages while loading', async () => {
    client.create.mockResolvedValue({ file: { id: 'test' } as FileJSON });
    client.upload.mockImplementation(async () => {
      await sleep(100);
      throw new Error('stop!');
    });

    const { actions, exists, testSubjects } = await initTestBed();
    expect(exists(testSubjects.errorMessage)).toBe(false);
    await actions.addFiles([{ name: 'test', size: 1 } as File]);
    expect(exists(testSubjects.errorMessage)).toBe(false);
    await actions.upload();
    expect(exists(testSubjects.errorMessage)).toBe(false);
    await actions.wait(1000);
    expect(exists(testSubjects.uploadButton)).toBe(false); // No upload button
    expect(exists(testSubjects.errorMessage)).toBe(true);
    await actions.upload(true);
    expect(exists(testSubjects.errorMessage)).toBe(false);
    await actions.wait(500);
    expect(exists(testSubjects.errorMessage)).toBe(true);

    expect(onDone).not.toHaveBeenCalled();
  });

  it('shows error messages if there are any', async () => {
    client.create.mockResolvedValue({ file: { id: 'test', size: 10001 } as FileJSON });
    client.upload.mockImplementation(async () => {
      await sleep(100);
      throw new Error('stop!');
    });

    const { actions, exists, testSubjects, find } = await initTestBed();
    expect(exists(testSubjects.errorMessage)).toBe(false);
    await actions.addFiles([{ name: 'test', size: 1 } as File]);
    await actions.upload();
    await actions.wait(1000);
    expect(find(testSubjects.errorMessage).text()).toMatch(/stop/i);
    expect(onDone).not.toHaveBeenCalled();
  });

  it('prevents uploads if there is an issue', async () => {
    client.create.mockResolvedValue({ file: { id: 'test', size: 10001 } as FileJSON });

    const { actions, exists, testSubjects, find } = await initTestBed();
    expect(exists(testSubjects.errorMessage)).toBe(false);
    await actions.addFiles([{ name: 'test', size: 10001 } as File]);
    expect(exists(testSubjects.errorMessage)).toBe(true);
    expect(find(testSubjects.errorMessage).text()).toMatch(/File is too large/);

    expect(onDone).not.toHaveBeenCalled();
  });

  it('only shows the cancel control in compressed mode', async () => {
    const { actions, testSubjects, exists } = await initTestBed({ compressed: true });
    const assertButtons = () => {
      expect(exists(testSubjects.cancelButtonIcon)).toBe(true);
      expect(exists(testSubjects.cancelButton)).toBe(false);
      expect(exists(testSubjects.retryButton)).toBe(false);
      expect(exists(testSubjects.uploadButton)).toBe(false);
    };

    assertButtons();
    await actions.addFiles([{ name: 'test', size: 1 } as File]);
    assertButtons();
    await actions.wait(1000);
    assertButtons();
  });
});
