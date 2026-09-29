/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { monaco } from '@kbn/code-editor';
import { I18nProvider } from '@kbn/i18n-react';
import { ServiceAccountEditorWidgets } from './service_account_editor_widgets';
import { useKibana } from '../../../../hooks/use_kibana';
import { createStartServicesMock, createUseKibanaMockValue } from '../../../../mocks';
import {
  createMockMonacoEditor,
  createMockMonacoModel,
} from '../../../../shared/test_utils/mock_monaco';
import { createServiceAccountEditor } from '../../lib/service_accounts/service_account_editor';
import { useServiceAccountEditor } from '../hooks/use_service_account_editor';

jest.mock('../../../../hooks/use_kibana');
jest.mock('../hooks/use_service_account_editor');

const account = {
  id: 'opaque-id',
  name: 'Investigation reader',
  roles: ['viewer'],
  enabled: true,
  assumable: true,
};
const mouseEvent = (position: monaco.Position | null): monaco.editor.IEditorMouseEvent => ({
  event: {
    defaultPrevented: false,
    browserEvent: new MouseEvent('mousemove'),
    leftButton: false,
    middleButton: false,
    rightButton: false,
    buttons: 0,
    target: document.body,
    detail: 0,
    posx: 0,
    posy: 0,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    metaKey: false,
    timestamp: 0,
    preventDefault: jest.fn(),
    stopPropagation: jest.fn(),
  },
  target: {
    type: monaco.editor.MouseTargetType.UNKNOWN,
    element: document.body,
    position,
    mouseColumn: position?.column ?? 1,
    range: null,
  },
});

const setup = (enabled = true, yaml = 'settings:\n  run_as: ') => {
  const directory = {
    isEnabled: () => enabled,
    get: jest.fn().mockResolvedValue(account),
    list: jest.fn().mockResolvedValue({ serviceAccounts: [account] }),
  };
  jest.mocked(useServiceAccountEditor).mockReturnValue(createServiceAccountEditor(directory));
  jest.mocked(useKibana).mockReturnValue(createUseKibanaMockValue(createStartServicesMock()));
  const { editor, model } = createMockMonacoEditor(yaml, {
    addContentWidget: jest.fn((widget) => document.body.appendChild(widget.getDomNode())),
    removeContentWidget: jest.fn((widget) => widget.getDomNode().remove()),
    layoutContentWidget: jest.fn(),
    createContextKey: jest.fn(() => ({ set: jest.fn(), reset: jest.fn(), get: jest.fn() })),
    getOption: jest.fn(),
    updateOptions: jest.fn(),
    hasTextFocus: jest.fn(() => true),
    getPosition: jest.fn(() => new monaco.Position(2, 11)),
    onDidFocusEditorText: jest.fn(() => ({ dispose: jest.fn() })),
    onDidBlurEditorText: jest.fn(() => ({ dispose: jest.fn() })),
    onMouseMove: jest.fn(() => ({ dispose: jest.fn() })),
    onMouseLeave: jest.fn(() => ({ dispose: jest.fn() })),
    trigger: jest.fn(),
    pushUndoStop: jest.fn(() => true),
    executeEdits: jest.fn(() => true),
  });
  model.isDisposed = jest.fn(() => false);
  const result = render(<ServiceAccountEditorWidgets editor={editor} />, { wrapper: I18nProvider });
  const action = async (id: string) => {
    const descriptor = jest
      .mocked(editor.addAction)
      .mock.calls.find(([value]) => value.id === `workflows.serviceAccount.${id}`)?.[0];
    if (!descriptor) throw new Error(`Missing action: ${id}`);
    await act(async () => {
      await descriptor.run(editor);
    });
  };
  return { ...result, editor, model, directory, action };
};

describe('ServiceAccountEditorWidgets', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    HTMLElement.prototype.scrollIntoView = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('offers unrelated accounts when replacing an existing ID with Ctrl+Space', async () => {
    const { directory, action, editor } = setup(true, 'settings:\n  run_as: opaque-id');
    directory.list.mockResolvedValue({
      serviceAccounts: [account, { ...account, id: 'replacement', name: 'Different account' }],
    });
    await action('suggest');
    const replacement = await screen.findByRole('option', { name: 'Different account viewer' });
    fireEvent.click(replacement);
    expect(editor.executeEdits).toHaveBeenCalledWith('serviceAccount', [
      {
        range: expect.objectContaining({ startColumn: 11, endColumn: 20 }),
        text: '"replacement"',
      },
    ]);
  });

  it('filters typed text but restores all accounts on explicit completion', async () => {
    const { directory, editor, model, action } = setup();
    directory.list.mockResolvedValue({
      serviceAccounts: [account, { ...account, id: 'replacement', name: 'Different account' }],
    });
    await screen.findByRole('option', { name: 'Investigation reader viewer' });
    Object.assign(model, createMockMonacoModel('settings:\n  run_as: Different'));
    model.getVersionId = jest.fn(() => 2);
    const position = new monaco.Position(2, 20);
    jest.mocked(editor.getPosition).mockReturnValue(position);
    act(() => {
      jest.mocked(editor.onDidChangeModelContent).mock.calls[0][0]({
        changes: [
          {
            range: new monaco.Range(2, 11, 2, 11),
            rangeOffset: 20,
            rangeLength: 0,
            text: 'Different',
          },
        ],
        eol: '\n',
        versionId: 2,
        isUndoing: false,
        isRedoing: false,
        isFlush: false,
        isEolChange: false,
        get detailedReasonsChangeLengths() {
          return this.changes.map(
            (change: monaco.editor.IModelContentChange) => change.rangeLength
          );
        },
      });
      jest.mocked(editor.onDidChangeCursorPosition).mock.calls[0][0]({
        position,
        secondaryPositions: [],
        reason: monaco.editor.CursorChangeReason.NotSet,
        source: 'keyboard',
      });
    });
    await screen.findByRole('option', { name: 'Different account viewer' });
    expect(
      screen.queryByRole('option', { name: 'Investigation reader viewer' })
    ).not.toBeInTheDocument();
    await action('suggest');
    expect(screen.getByRole('option', { name: 'Investigation reader viewer' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Different account viewer' })).toBeInTheDocument();
  });

  it.each(['over value', 'outside value', 'leave editor'])(
    'keeps pending completions when the pointer moves %s',
    async (movement) => {
      jest.useFakeTimers();
      const { directory, editor } = setup(true, 'settings:\n  run_as: opaque-id');
      let resolvePage: (page: { serviceAccounts: (typeof account)[] }) => void = () => {};
      directory.list.mockReturnValue(
        new Promise((resolve) => {
          resolvePage = resolve;
        })
      );
      await act(async () => {
        jest.advanceTimersByTime(100);
      });
      expect(directory.list).toHaveBeenCalled();
      act(() => {
        if (movement === 'leave editor') {
          jest.mocked(editor.onMouseLeave).mock.calls[0][0](mouseEvent(null));
        } else {
          jest
            .mocked(editor.onMouseMove)
            .mock.calls[0][0](
              mouseEvent(new monaco.Position(movement === 'over value' ? 2 : 1, 12))
            );
        }
      });
      await act(async () => {
        resolvePage({ serviceAccounts: [account] });
      });
      expect(screen.getByRole('option')).toHaveTextContent(account.name);
      await act(async () => {
        jest.advanceTimersByTime(500);
      });
      expect(screen.getByRole('option')).toHaveTextContent(account.name);
      expect(screen.queryByText('This deployment')).not.toBeInTheDocument();
    }
  );

  it('shows name and role badges, and clicking inserts only the stable ID', async () => {
    const { editor } = setup();
    const option = await screen.findByRole('option');
    expect(option).toHaveTextContent('Investigation reader');
    expect(option).toHaveTextContent('viewer');
    expect(option).not.toHaveTextContent('opaque-id');
    fireEvent.click(option);
    expect(editor.executeEdits).toHaveBeenCalledWith('serviceAccount', [
      {
        range: expect.objectContaining({ startLineNumber: 2, startColumn: 11 }),
        text: '"opaque-id"',
      },
    ]);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('supports keyboard selection and dismissal without mutating YAML', async () => {
    const { editor, directory, action } = setup();
    directory.list.mockResolvedValue({
      serviceAccounts: [account, { ...account, id: 'second', name: 'Second reader' }],
    });
    await screen.findByRole('listbox');
    await action('next');
    expect(screen.getByRole('option', { selected: true })).toHaveTextContent('Second reader');
    await action('dismiss');
    expect(editor.executeEdits).not.toHaveBeenCalled();
    await action('suggest');
    await screen.findByRole('listbox');
    await action('next');
    await action('accept');
    expect(editor.executeEdits).toHaveBeenCalledWith('serviceAccount', [
      expect.objectContaining({ text: '"second"' }),
    ]);
  });

  it.each(['keyboard', 'mouse'])('announces and accepts pagination using the %s', async (input) => {
    const { editor, directory, action } = setup();
    directory.list.mockImplementation(async (after?: string) =>
      after
        ? { serviceAccounts: [{ ...account, id: 'second', name: 'Second reader' }] }
        : { serviceAccounts: [account], nextPage: 'page-two' }
    );
    const more = await screen.findByRole('option', { name: 'Load more service accounts' });
    await action('next');
    expect(more).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('status')).toHaveTextContent('Load more service accounts');
    if (input === 'keyboard') await action('accept');
    else fireEvent.click(more);
    await screen.findByRole('option', { name: 'Second reader viewer' });
    expect(directory.list).toHaveBeenLastCalledWith('page-two');
    expect(editor.executeEdits).not.toHaveBeenCalled();
    expect(
      screen.queryByRole('option', { name: 'Load more service accounts' })
    ).not.toBeInTheDocument();
  });

  it('opens details from the keyboard and dismisses them with Escape', async () => {
    const { action } = setup(true, 'settings:\n  run_as: opaque-id');
    await screen.findByRole('listbox');
    await action('dismiss');
    await action('details');
    expect(screen.getByText('This deployment')).toBeInTheDocument();
    await action('dismiss');
    expect(screen.queryByText('This deployment')).not.toBeInTheDocument();
  });

  it('does not accept a suggestion after the editor becomes read-only', async () => {
    const { editor } = setup();
    const option = await screen.findByRole('option');
    jest.mocked(editor.getOption).mockReturnValue(true);
    fireEvent.click(option);
    expect(editor.executeEdits).not.toHaveBeenCalled();
  });

  it('attaches no widgets and makes no directory calls when disabled', () => {
    const { editor, directory } = setup(false);
    expect(editor.addContentWidget).not.toHaveBeenCalled();
    expect(directory.list).not.toHaveBeenCalled();
    expect(directory.get).not.toHaveBeenCalled();
  });

  it('removes the widget and restores editor options on unmount', async () => {
    const { editor, unmount } = setup();
    await screen.findByRole('listbox');
    unmount();
    expect(editor.removeContentWidget).toHaveBeenCalledTimes(1);
    expect(editor.updateOptions).toHaveBeenLastCalledWith({
      quickSuggestions: undefined,
      suggestOnTriggerCharacters: undefined,
    });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('does not show stale results after the editor is removed', async () => {
    const { directory, unmount } = setup();
    let resolvePage: (page: { serviceAccounts: (typeof account)[] }) => void = () => {};
    directory.list.mockReturnValue(
      new Promise((resolve) => {
        resolvePage = resolve;
      })
    );
    await waitFor(() => expect(directory.list).toHaveBeenCalled());
    unmount();
    await act(async () => resolvePage({ serviceAccounts: [account] }));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});
