/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parseDocument } from 'yaml';
import { monaco } from '@kbn/code-editor';
import {
  createServiceAccountEditor,
  getRunAsValue,
  LOAD_MORE_SERVICE_ACCOUNTS,
  type ServiceAccountEditorContext,
} from './service_account_editor';
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
const completionContext = { triggerKind: monaco.languages.CompletionTriggerKind.Invoke };
const setup = (markedYaml: string, context?: ServiceAccountEditorContext) => {
  const offset = markedYaml.indexOf('|<-');
  const yaml = markedYaml.replace('|<-', '');
  const model = createFakeMonacoModel(yaml, offset);
  const position = model.getPositionAt(offset);
  const document = parseDocument(yaml);
  const directory: jest.Mocked<ServiceAccountDirectory> = {
    isEnabled: jest.fn().mockReturnValue(true),
    get: jest.fn().mockResolvedValue(account),
    list: jest.fn().mockResolvedValue({ serviceAccounts: [account] }),
  };
  const editor = createServiceAccountEditor(directory, context);
  const complete = () =>
    editor.completionProvider.provideCompletionItems(
      model,
      position,
      completionContext,
      cancellation
    );
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
      expect(suggestion?.label).toEqual({ label: account.name, description: account.id });
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
  ])('does not offer accounts outside the root settings value', async (yaml) => {
    const { complete, directory } = setup(yaml);
    expect(await complete()).toBeNull();
    expect(directory.list).not.toHaveBeenCalled();
  });

  it('does not query when disabled', async () => {
    const { complete, directory } = setup('settings:\n  run_as: |<-');
    directory.isEnabled.mockReturnValue(false);
    expect(await complete()).toBeNull();
    expect(directory.list).not.toHaveBeenCalled();
  });

  it('loads additional pages only on demand, preserving typed input', async () => {
    const { complete, directory, editor, position } = setup('settings:\n  run_as: Read|<-');
    directory.list.mockImplementation(async (after) =>
      after
        ? { serviceAccounts: [{ ...account, id: 'b', name: 'Second reader' }] }
        : { serviceAccounts: [account], nextPage: 'page-b' }
    );
    const first = await complete();
    expect(directory.list).toHaveBeenCalledTimes(1);
    const more = first?.suggestions.find(
      (suggestion) => suggestion.command?.id === LOAD_MORE_SERVICE_ACCOUNTS
    );
    expect(more?.insertText).toBe('');
    expect(more?.range).toEqual({
      startLineNumber: position.lineNumber,
      endLineNumber: position.lineNumber,
      startColumn: position.column,
      endColumn: position.column,
    });
    editor.loadMore();
    const second = await complete();
    expect(directory.list).toHaveBeenLastCalledWith('page-b');
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

  it('resolves a saved ID for hover and treats the text as untrusted', async () => {
    const { editor, directory, model, position } = setup(
      'settings:\n  run_as: "opaque/account-id"|<-'
    );
    const hover = await editor.provideHover(model, position);
    expect(directory.get).toHaveBeenCalledWith(account.id);
    expect(hover?.contents[0]).toMatchObject({ isTrusted: false, supportHtml: false });
    expect(hover?.contents[0].value).toContain(account.name);
    expect(hover?.contents[0].value).toContain('**Roles:** viewer');
    expect(hover?.contents[0].value).toContain('**Role scope:** This deployment');
    expect(hover?.contents[0].value).toContain('**Status:** Enabled');
    expect(hover?.contents[0].value).toContain('**Kibana can assume this account:** Yes');
    expect(hover?.contents[0].value).not.toContain('**Project');
  });

  it('shows current project context for Serverless without inventing other project assignments', async () => {
    const { editor, directory, model, position } = setup('settings:\n  run_as: opaque|<-', {
      isServerless: true,
      projectName: 'Investigation project',
      projectId: 'project123',
    });
    directory.get.mockResolvedValue({ ...account, roles: ['viewer', 'custom_reader'] });
    const hover = await editor.provideHover(model, position);
    expect(hover?.contents[0].value).toContain('**Role scope:** Current project');
    expect(hover?.contents[0].value).toContain('**Project:** Investigation project');
    expect(hover?.contents[0].value).toContain('**Project ID:** project123');
    expect(hover?.contents[0].value).toContain('**Roles:** viewer, custom\\_reader');
    expect(hover?.contents[0].value).not.toContain('**Projects:**');
  });

  it('does not invent a project name or ID when cloud metadata is unavailable', async () => {
    const { editor, model, position } = setup('settings:\n  run_as: opaque|<-', {
      isServerless: true,
    });
    const hover = await editor.provideHover(model, position);
    expect(hover?.contents[0].value).toContain('**Role scope:** Current project');
    expect(hover?.contents[0].value).not.toContain('**Project:**');
    expect(hover?.contents[0].value).not.toContain('**Project ID:**');
  });

  it('shows missing roles and unavailable account state explicitly', async () => {
    const { editor, directory, model, position } = setup('settings:\n  run_as: opaque|<-');
    directory.get.mockResolvedValue({ ...account, roles: [], enabled: false, assumable: false });
    const hover = await editor.provideHover(model, position);
    expect(hover?.contents[0].value).toContain('**Roles:** No roles assigned');
    expect(hover?.contents[0].value).toContain('**Status:** Disabled');
    expect(hover?.contents[0].value).toContain('**Kibana can assume this account:** No');
  });

  it('escapes directory and project metadata as plain text', async () => {
    const { editor, directory, model, position } = setup('settings:\n  run_as: opaque|<-', {
      isServerless: true,
      projectName: '<project>',
      projectId: 'project`123',
    });
    directory.get.mockResolvedValue({
      ...account,
      id: 'id`123',
      name: '[Account](command:run)',
      roles: ['reader\n**admin**'],
    });
    const hover = await editor.provideHover(model, position);
    expect(hover?.contents[0]).toMatchObject({ isTrusted: false, supportHtml: false });
    expect(hover?.contents[0].value).toContain('\\[Account\\]\\(command:run\\)');
    expect(hover?.contents[0].value).toContain('**ID:** id\\`123');
    expect(hover?.contents[0].value).toContain('**Roles:** reader \\*\\*admin\\*\\*');
    expect(hover?.contents[0].value).toContain('**Project:** \\<project\\>');
    expect(hover?.contents[0].value).toContain('**Project ID:** project\\`123');
  });

  it('does not look up account details on hover when the feature is disabled', async () => {
    const { editor, directory, model, position } = setup('settings:\n  run_as: opaque|<-');
    directory.isEnabled.mockReturnValue(false);
    expect(await editor.provideHover(model, position)).toBeNull();
    expect(directory.get).not.toHaveBeenCalled();
  });

  it('falls back to normal hover when lookup is denied or missing', async () => {
    const { editor, directory, model, position } = setup('settings:\n  run_as: opaque|<-');
    directory.get.mockResolvedValue(null);
    expect(getRunAsValue(model, position)?.id).toBe('opaque');
    expect(await editor.provideHover(model, position)).toBeNull();
  });
});
