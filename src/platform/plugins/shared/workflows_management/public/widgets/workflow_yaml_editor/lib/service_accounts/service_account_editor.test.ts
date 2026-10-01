/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parseDocument } from 'yaml';
import { createServiceAccountEditor, getRunAsValue } from './service_account_editor';
import { createFakeMonacoModel } from '../../../../../common/mocks/monaco_model';
import type { ServiceAccountDirectory } from '../../../../entities/service_accounts';

const account = {
  id: 'opaque/account-id',
  name: 'Readable account',
  roles: ['viewer'],
  enabled: true,
  assumable: true,
};
const cancellation = {
  isCancellationRequested: false,
  onCancellationRequested: () => ({ dispose() {} }),
};
const setup = (markedYaml: string) => {
  const offset = markedYaml.indexOf('|<-');
  const yaml = markedYaml.replace('|<-', '');
  const model = createFakeMonacoModel(yaml, offset);
  model.getVersionId = jest.fn(() => 1);
  const position = model.getPositionAt(offset);
  const document = parseDocument(yaml);
  const directory: jest.Mocked<ServiceAccountDirectory> = {
    isEnabled: jest.fn().mockReturnValue(true),
    get: jest.fn().mockResolvedValue(account),
    list: jest.fn().mockResolvedValue({ serviceAccounts: [account] }),
  };
  const editor = createServiceAccountEditor(directory);
  const complete = () =>
    editor.completionProvider.provideCompletionItems(model, position, cancellation);
  return { yaml, model, position, document, directory, editor, complete };
};

describe('service account editor', () => {
  it.each(['', 'Read', '"Read"', "'Read'"])(
    'replaces the complete scalar %s with the stable ID',
    async (value) => {
      const { complete, model, yaml } = setup(
        `settings:\n  run_as: ${value}|<- # preserve this comment\nsteps: []`
      );
      const result = await complete();
      expect(result?.suggestions).toHaveLength(1);
      const suggestion = result?.suggestions[0];
      expect(suggestion?.label).toEqual(account.name);
      expect(suggestion?.account?.roles).toEqual(['viewer']);
      expect(suggestion?.insertText).toBe(JSON.stringify(account.id));
      if (!suggestion || !('startLineNumber' in suggestion.range))
        throw new Error('Missing replacement range');
      const start = model.getOffsetAt({
        lineNumber: suggestion.range.startLineNumber,
        column: suggestion.range.startColumn,
      });
      const end = model.getOffsetAt({
        lineNumber: suggestion.range.endLineNumber,
        column: suggestion.range.endColumn,
      });
      const changed = yaml.slice(0, start) + suggestion.insertText + yaml.slice(end);
      expect(parseDocument(changed).getIn(['settings', 'run_as'])).toBe(account.id);
      expect(changed).toContain('# preserve this comment');
    }
  );

  it.each(['', 'Read', '"Read"', "'Read'"])(
    'completes inline settings with scalar %s without changing adjacent fields or comments',
    async (value) => {
      const { complete, model, yaml } = setup(
        `settings: { run_as: ${value}|<-, timezone: UTC } # preserve this comment\nsteps: []`
      );
      const suggestion = (await complete())?.suggestions[0];
      if (!suggestion || !('startLineNumber' in suggestion.range))
        throw new Error('Missing inline service account completion');
      const start = model.getOffsetAt({
        lineNumber: suggestion.range.startLineNumber,
        column: suggestion.range.startColumn,
      });
      const end = model.getOffsetAt({
        lineNumber: suggestion.range.endLineNumber,
        column: suggestion.range.endColumn,
      });
      const changed = yaml.slice(0, start) + suggestion.insertText + yaml.slice(end);
      expect(changed).toBe(
        `settings: { run_as: "opaque/account-id", timezone: UTC } # preserve this comment\nsteps: []`
      );
      expect(parseDocument(changed).errors).toEqual([]);
    }
  );

  it.each([
    'settings: { timezone: UTC, run_as: "opaque/account-|<-id" }',
    'settings: { "run_as": "opaque/account-|<-id" }',
    'settings: { "run_\\u0061s": "opaque/account-|<-id" }',
  ])('resolves inline account details from the settings map: %s', async (yaml) => {
    const { editor, directory, model, position } = setup(yaml);
    expect(await editor.getAccountAtPosition(model, position)).toMatchObject({ account });
    expect(directory.get).toHaveBeenCalledWith(account.id);
  });

  it('resolves the current value after editing the same model', () => {
    const { model, position } = setup('settings:\n  run_as: first|<-');
    expect(getRunAsValue(model, position)?.id).toBe('first');

    const updated = setup('settings: { run_as: "second|<-" }');
    Object.assign(model, updated.model);
    model.getVersionId = jest.fn(() => 2);
    expect(getRunAsValue(model, updated.position)?.id).toBe('second');
  });

  it('adds YAML separation when completing immediately after the colon', async () => {
    const { complete } = setup('settings:\n  run_as:|<-');
    expect((await complete())?.suggestions[0].insertText).toBe(` ${JSON.stringify(account.id)}`);
  });

  it.each([
    'run_as: |<-',
    'steps:\n  - name: test\n    with:\n      run_as: |<-',
    'settings:\n  run_as: account # comment |<-',
    'settings:\n  ru|<-n_as: account',
    'settings:\n  run_as: |\n    multi |<-',
    'settings: { run_as: account, timezone: U|<-TC }',
    'settings: { run_as: account } # comment |<-',
    'settings: { ru|<-n_as: account }',
    '{settings: { run_as: account },|<- steps: []}',
    'steps: [{ name: test, with: { run_as: acc|<-ount } }]',
  ])('does not offer accounts outside the root settings value', async (yaml) => {
    const { complete, directory } = setup(yaml);
    expect(await complete()).toBeNull();
    expect(directory.list).not.toHaveBeenCalled();
  });

  it.each(['settings:\n  run_as: |<-', 'settings: { run_as: |<- }'])(
    'does not query when disabled: %s',
    async (yaml) => {
      const { complete, directory } = setup(yaml);
      directory.isEnabled.mockReturnValue(false);
      expect(await complete()).toBeNull();
      expect(directory.list).not.toHaveBeenCalled();
    }
  );

  it('loads additional pages only on demand, preserving typed input', async () => {
    const { complete, directory, editor, position } = setup('settings:\n  run_as: Read|<-');
    directory.list.mockImplementation(async (after) =>
      after
        ? { serviceAccounts: [{ ...account, id: 'b', name: 'Second reader' }] }
        : { serviceAccounts: [account], nextPage: 'page-b' }
    );
    const first = await complete();
    expect(directory.list).toHaveBeenCalledTimes(1);
    const more = first?.suggestions.find((suggestion) => !suggestion.account);
    expect(more?.insertText).toBe('');
    expect(more?.range).toEqual({
      startLineNumber: position.lineNumber,
      endLineNumber: position.lineNumber,
      startColumn: position.column,
      endColumn: position.column,
    });
    editor.loadMore();
    const second = await complete();
    expect(directory.list).toHaveBeenLastCalledWith('page-b', false);
    expect(second?.suggestions.map((suggestion) => suggestion.insertText)).toEqual([
      JSON.stringify(account.id),
      '"b"',
    ]);
  });

  it('excludes disabled and non-assumable accounts', async () => {
    const { complete, directory } = setup('settings:\n  run_as: |<-');
    directory.list.mockResolvedValue({
      serviceAccounts: [
        account,
        account,
        { ...account, id: 'disabled', enabled: false },
        { ...account, id: 'external', assumable: false },
      ],
    });
    expect((await complete())?.suggestions).toHaveLength(1);
  });

  it('clears suggestions if a later page is denied', async () => {
    const { complete, directory, editor } = setup('settings:\n  run_as: |<-');
    directory.list.mockResolvedValueOnce({ serviceAccounts: [account], nextPage: 'b' });
    await complete();
    editor.loadMore();
    directory.list
      .mockResolvedValueOnce({ serviceAccounts: [account], nextPage: 'b' })
      .mockResolvedValueOnce(null);
    expect((await complete())?.suggestions).toEqual([]);
  });

  it('resolves details using the stable ID and preserves role metadata', async () => {
    const { editor, directory, model, position } = setup(
      'settings:\n  run_as: "opaque/account-id"|<-'
    );
    expect(await editor.getAccountAtPosition(model, position)).toMatchObject({ account });
    expect(directory.get).toHaveBeenCalledWith(account.id);
  });

  it('includes unavailable accounts in details, even though they cannot be suggested', async () => {
    const { editor, directory, model, position } = setup('settings:\n  run_as: opaque|<-');
    directory.get.mockResolvedValue({ ...account, roles: [], enabled: false, assumable: false });
    expect(await editor.getAccountAtPosition(model, position)).toMatchObject({
      account: { roles: [], enabled: false, assumable: false },
    });
  });

  it.each(['settings:\n  run_as: opaque|<-', 'settings: { run_as: opaque|<- }'])(
    'does not look up disabled account details: %s',
    async (yaml) => {
      const { editor, directory, model, position } = setup(yaml);
      directory.isEnabled.mockReturnValue(false);
      expect(await editor.getAccountAtPosition(model, position)).toBeNull();
      expect(directory.get).not.toHaveBeenCalled();
    }
  );

  it('falls back to normal hover when lookup is denied or missing', async () => {
    const { editor, directory, model, position } = setup('settings:\n  run_as: opaque|<-');
    directory.get.mockResolvedValue(null);
    expect(getRunAsValue(model, position)?.id).toBe('opaque');
    expect(await editor.getAccountAtPosition(model, position)).toBeNull();
  });
});
