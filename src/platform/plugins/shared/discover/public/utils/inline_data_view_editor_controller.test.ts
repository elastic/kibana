/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { waitFor } from '@testing-library/react';
import { nextTick } from '@kbn/test-jest-helpers';
import { DataView } from '@kbn/data-views-plugin/common';
import { fieldFormatsMock } from '@kbn/field-formats-plugin/common/mocks';
import { createInlineDataViewEditorController } from './inline_data_view_editor_controller';

type OpenEditor = Parameters<
  ReturnType<typeof createInlineDataViewEditorController>['open']
>[0]['openEditor'];

const setup = () => {
  const draft = new DataView({
    spec: { id: 'draft', title: 'logs-*' },
    fieldFormats: fieldFormatsMock,
  });
  const session = {
    draft: Promise.resolve(draft),
    commit: jest.fn().mockResolvedValue(draft),
    dispose: jest.fn(),
  };
  const closeEditor = jest.fn();
  const openEditor = jest.fn<ReturnType<OpenEditor>, Parameters<OpenEditor>>(() => closeEditor);
  const onError = jest.fn();
  const controller = createInlineDataViewEditorController();
  const close = controller.open({ session, openEditor, onError });
  return { draft, session, closeEditor, openEditor, onError, close, controller };
};

describe('createInlineDataViewEditorController', () => {
  it('commits through the session and passes the result to the consumer', async () => {
    const { session, openEditor, draft } = setup();
    await waitFor(() => expect(openEditor).toHaveBeenCalled());
    const [, actions] = openEditor.mock.calls[0];
    const onSave = jest.fn();

    await actions.commit(onSave, { updatedFieldNames: ['field'] });

    expect(session.commit).toHaveBeenCalledWith({ updatedFieldNames: ['field'] });
    expect(onSave).toHaveBeenCalledWith(draft);
  });

  it('does not open a cancelled editor and disposes only once', async () => {
    const { close, session, openEditor } = setup();
    close();
    close();
    await nextTick();
    expect(session.dispose).toHaveBeenCalledTimes(1);
    expect(openEditor).not.toHaveBeenCalled();
  });

  it('releases the previous session on replacement without letting its close affect the new one', async () => {
    const { controller, session, openEditor, onError, close } = setup();
    const replacement = { ...session, dispose: jest.fn() };
    controller.open({ session: replacement, openEditor, onError });
    close();

    await waitFor(() => expect(openEditor).toHaveBeenCalledTimes(1));
    expect(session.dispose).toHaveBeenCalledTimes(1);
    expect(replacement.dispose).not.toHaveBeenCalled();

    controller.dispose();
    controller.dispose();
    expect(replacement.dispose).toHaveBeenCalledTimes(1);
  });

  it('closes an editor that finishes opening after cancellation', async () => {
    const { session, openEditor, closeEditor, close } = setup();
    let finish: (close: () => void) => void = () => {};
    openEditor.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    await waitFor(() => expect(openEditor).toHaveBeenCalled());
    close();
    expect(session.dispose).toHaveBeenCalledTimes(1);
    finish(closeEditor);
    await waitFor(() => expect(closeEditor).toHaveBeenCalledTimes(1));
    expect(session.dispose).toHaveBeenCalledTimes(1);
  });

  it('disposes and reports an opening failure', async () => {
    const { openEditor, session, onError } = setup();
    const error = new Error('Opening failed');
    openEditor.mockImplementationOnce(() => {
      throw error;
    });
    await waitFor(() => expect(onError).toHaveBeenCalledWith(error, 'open'));
    expect(session.dispose).toHaveBeenCalled();
  });

  it('reports a commit failure without calling the consumer', async () => {
    const { openEditor, session, onError } = setup();
    await waitFor(() => expect(openEditor).toHaveBeenCalled());
    const error = new Error('Commit failed');
    session.commit.mockRejectedValueOnce(error);
    const onSave = jest.fn();
    await openEditor.mock.calls[0][1].commit(onSave);
    expect(onError).toHaveBeenCalledWith(error, 'commit');
    expect(onSave).not.toHaveBeenCalled();
  });

  it('does not apply a pending confirmation after unmount', async () => {
    const { openEditor, session, close, draft, onError } = setup();
    await waitFor(() => expect(openEditor).toHaveBeenCalled());
    let finish: (view: DataView) => void = () => {};
    session.commit.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    const onSave = jest.fn();
    const saving = openEditor.mock.calls[0][1].commit(onSave);
    close();
    finish(draft);
    await saving;
    expect(onSave).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });

  it('does not relabel consumer failures as identity failures', async () => {
    const { openEditor, onError } = setup();
    await waitFor(() => expect(openEditor).toHaveBeenCalled());
    const error = new Error('Consumer failed');
    await expect(
      openEditor.mock.calls[0][1].commit(() => {
        throw error;
      })
    ).rejects.toBe(error);
    expect(onError).not.toHaveBeenCalled();
  });
});
