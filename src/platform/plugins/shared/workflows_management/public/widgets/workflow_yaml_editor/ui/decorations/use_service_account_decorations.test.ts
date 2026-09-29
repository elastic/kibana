/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { registerServiceAccountDecorations } from './use_service_account_decorations';
import type {
  ServiceAccountDirectory,
  WorkflowServiceAccount,
} from '../../../../entities/service_accounts';
import {
  createMockMonacoEditor,
  createMockMonacoModel,
} from '../../../../shared/test_utils/mock_monaco';

const account: WorkflowServiceAccount = {
  id: 'account-a',
  name: 'Demo reader',
  roles: ['viewer'],
  enabled: true,
  assumable: true,
};
const yaml = 'settings:\n  run_as: account-a\nsteps: []';
const setup = (value = yaml) => {
  const mocks = createMockMonacoEditor(value, {
    onDidChangeModel: jest.fn(() => ({ dispose: jest.fn() })),
  });
  mocks.model.getVersionId = jest.fn(() => 1);
  const directory: jest.Mocked<ServiceAccountDirectory> = {
    isEnabled: jest.fn(() => true),
    get: jest.fn().mockResolvedValue(account),
    list: jest.fn(),
  };
  return { ...mocks, directory };
};

describe('service account editor badge', () => {
  it('decorates the resolved ID without changing YAML', async () => {
    const { editor, model, decorationsCollection, directory } = setup();
    const registration = registerServiceAccountDecorations(editor, directory);
    await Promise.resolve();
    expect(directory.get).toHaveBeenCalledWith('account-a');
    expect(decorationsCollection.set).toHaveBeenCalledWith([
      expect.objectContaining({
        options: expect.objectContaining({
          before: expect.objectContaining({
            content: '✓ Demo reader',
            inlineClassName: 'service-account-name-badge',
          }),
        }),
      }),
    ]);
    expect(model.getValue()).toBe(yaml);
    registration.dispose();
  });

  it.each(['# settings:\n#   run_as: account-a', 'steps:\n  - with:\n      run_as: account-a'])(
    'ignores comments and non-workflow settings',
    async (value) => {
      const { editor, directory } = setup(value);
      const registration = registerServiceAccountDecorations(editor, directory);
      await Promise.resolve();
      expect(directory.get).not.toHaveBeenCalled();
      registration.dispose();
    }
  );

  it.each([{ enabled: false }, { assumable: false }])(
    'does not mark an unavailable account as connected',
    async (flags) => {
      const { editor, decorationsCollection, directory } = setup();
      directory.get.mockResolvedValue({ ...account, ...flags });
      const registration = registerServiceAccountDecorations(editor, directory);
      await Promise.resolve();
      expect(decorationsCollection.set).toHaveBeenCalledWith([
        expect.objectContaining({
          options: expect.objectContaining({
            before: expect.objectContaining({
              content: '○ Demo reader',
              inlineClassName: 'service-account-name-badge-unavailable',
            }),
          }),
        }),
      ]);
      registration.dispose();
    }
  );

  it('leaves a raw ID when the directory is inaccessible', async () => {
    const { editor, decorationsCollection, directory } = setup();
    directory.get.mockResolvedValue(null);
    const registration = registerServiceAccountDecorations(editor, directory);
    await Promise.resolve();
    expect(decorationsCollection.set).toHaveBeenCalledWith([]);
    registration.dispose();
  });

  it('ignores a lookup that finishes after the editor switched documents', async () => {
    const { editor, decorationsCollection, directory } = setup();
    let resolveAccount: (value: WorkflowServiceAccount) => void = () => {};
    directory.get.mockReturnValue(
      new Promise((resolve) => {
        resolveAccount = resolve;
      })
    );
    const registration = registerServiceAccountDecorations(editor, directory);
    jest
      .mocked(editor.getModel)
      .mockReturnValue(createMockMonacoModel('settings:\n  run_as: account-b'));
    resolveAccount(account);
    await Promise.resolve();
    expect(decorationsCollection.set).not.toHaveBeenCalled();
    registration.dispose();
  });

  it('disposes listeners and ignores an outstanding lookup after unmount', async () => {
    const { editor, decorationsCollection, directory } = setup();
    let resolveAccount: (value: WorkflowServiceAccount) => void = () => {};
    directory.get.mockReturnValue(
      new Promise((resolve) => {
        resolveAccount = resolve;
      })
    );
    const registration = registerServiceAccountDecorations(editor, directory);
    registration.dispose();
    resolveAccount(account);
    await Promise.resolve();
    expect(decorationsCollection.set).not.toHaveBeenCalled();
    expect(
      jest.mocked(editor.onDidChangeModelContent).mock.results[0].value.dispose
    ).toHaveBeenCalled();
    expect(jest.mocked(editor.onDidChangeModel).mock.results[0].value.dispose).toHaveBeenCalled();
  });
});
