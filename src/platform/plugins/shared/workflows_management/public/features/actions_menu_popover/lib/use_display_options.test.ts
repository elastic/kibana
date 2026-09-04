/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildDisplayOptions, STEPS_PREFIX } from './use_display_options';
import type {
  ActionOptionData,
  EditorCommand,
  JumpToStepEntry,
  MenuSelectableOption,
} from '../types';

const makeAction = (id: string, label: string, description?: string): ActionOptionData => ({
  id,
  label,
  description,
  iconType: 'empty' as const,
});

const makeGroup = (id: string, label: string, options: ActionOptionData[]): ActionOptionData => ({
  id,
  label,
  iconType: 'empty' as const,
  options,
});

const mockCommands: EditorCommand[] = [
  { id: 'foldAll', label: 'Collapse all', iconType: 'minusInCircle' },
  { id: 'unfoldAll', label: 'Expand all', iconType: 'plusInCircle' },
];

const mockJumps: JumpToStepEntry[] = [
  { id: 'step_one', label: '#step_one', lineStart: 5 },
  { id: 'step_two', label: '#step_two', lineStart: 15 },
  { id: 'alert_step', label: '#alert_step', lineStart: 25 },
];

const dataKinds = (result: MenuSelectableOption[]) =>
  result.filter((o) => !o.isGroupLabel).map((o) => o.data?.menuItem?.kind);

const groupLabels = (result: MenuSelectableOption[]) =>
  result.filter((o) => o.isGroupLabel).map((o) => o.label);

describe('buildDisplayOptions', () => {
  const base = {
    options: [] as ActionOptionData[],
    searchTerm: '',
    commands: mockCommands,
    jumpToStepEntries: mockJumps,
    currentPath: [] as string[],
  };

  it('shows Add trigger or step + Commands sections when no search is active', () => {
    const result = buildDisplayOptions(base);
    expect(groupLabels(result)).toEqual(['Add trigger or step', 'Commands']);
    expect(dataKinds(result)).toEqual(['command', 'command']);
  });

  it('returns action items alphabetically when inside a sub-group', () => {
    const options = [makeAction('z', 'Zulu'), makeAction('a', 'Alpha'), makeAction('m', 'Mike')];
    const result = buildDisplayOptions({ ...base, options, currentPath: ['group1'] });
    expect(result.map((o) => o.label)).toEqual(['Alpha', 'Mike', 'Zulu']);
  });

  describe('hash mode (#)', () => {
    it('shows only jump entries when search starts with #', () => {
      const result = buildDisplayOptions({ ...base, searchTerm: '#' });
      expect(groupLabels(result)).toEqual(['Jump to a step']);
      expect(dataKinds(result)).toEqual(['jump', 'jump', 'jump']);
    });

    it('filters jump entries by term after #', () => {
      const result = buildDisplayOptions({ ...base, searchTerm: '#alert' });
      const jumps = result.filter((o) => o.data?.menuItem?.kind === 'jump');
      expect(jumps).toHaveLength(1);
      expect(jumps[0].label).toBe('#alert_step');
    });

    it('excludes Commands and Add trigger or step sections', () => {
      const result = buildDisplayOptions({ ...base, searchTerm: '#' });
      expect(groupLabels(result)).not.toContain('Commands');
      expect(groupLabels(result)).not.toContain('Add trigger or step');
    });
  });

  describe('Steps: prefix mode', () => {
    it('shows all action options without limit', () => {
      const manyActions = Array.from({ length: 15 }, (_, i) =>
        makeAction(`act${i}`, `Action ${i}`)
      );
      const result = buildDisplayOptions({
        ...base,
        options: manyActions,
        searchTerm: `${STEPS_PREFIX}act`,
      });
      const actions = result.filter((o) => o.data?.menuItem?.kind === 'action');
      expect(actions).toHaveLength(15);
    });

    it('does not include Commands or Jump sections', () => {
      const result = buildDisplayOptions({
        ...base,
        options: [makeAction('a', 'A')],
        searchTerm: `${STEPS_PREFIX}a`,
      });
      expect(groupLabels(result)).toEqual([]);
    });
  });

  describe('normal search mode', () => {
    const external = makeGroup('external', 'External systems & apps', [
      makeGroup('shodan', 'Shodan', [
        makeAction('shodan.count', 'Count results', 'Count matching hosts'),
        makeAction('shodan.search', 'Search hosts', 'Search the Shodan database'),
      ]),
      makeGroup('virustotal', 'Virustotal', [
        makeAction('vt.analysis', 'Get analysis results', 'Retrieve analysis'),
      ]),
    ]);
    const data = makeGroup('data', 'Data transformation', [
      makeAction('rerank', 'Rerank results', 'Reorder documents by relevance'),
    ]);
    const categoryTree = [external, data];

    it('does not show Add trigger or step label during search', () => {
      const result = buildDisplayOptions({
        ...base,
        categoryTree,
        options: categoryTree,
        searchTerm: 'results',
      });
      expect(groupLabels(result)).not.toContain('Add trigger or step');
    });

    it('sections matching items under their root category headers', () => {
      const result = buildDisplayOptions({
        ...base,
        categoryTree,
        options: categoryTree,
        searchTerm: 'results',
        commands: [],
        jumpToStepEntries: [],
      });

      expect(groupLabels(result)).toEqual(['External systems & apps', 'Data transformation']);

      const actions = result.filter((o) => o.data?.menuItem?.kind === 'action');
      expect(actions.map((a) => a.label)).toEqual([
        'Count results',
        'Get analysis results',
        'Rerank results',
      ]);
    });

    it('enriches nested match descriptions with parent label', () => {
      const result = buildDisplayOptions({
        ...base,
        categoryTree,
        options: categoryTree,
        searchTerm: 'count',
        commands: [],
        jumpToStepEntries: [],
      });

      const action = result.find((o) => o.label === 'Count results');
      const menuItem = action?.data?.menuItem;
      expect(menuItem?.kind).toBe('action');
      if (menuItem?.kind === 'action') {
        expect(menuItem.action.description).toBe('Shodan - Count results');
      }
    });

    it('omits categories with no matches', () => {
      const result = buildDisplayOptions({
        ...base,
        categoryTree,
        options: categoryTree,
        searchTerm: 'rerank',
        commands: [],
        jumpToStepEntries: [],
      });

      expect(groupLabels(result)).toEqual(['Data transformation']);
      expect(groupLabels(result)).not.toContain('External systems & apps');
    });

    it('does not limit results or show viewAll nav', () => {
      const manyLeaves = Array.from({ length: 15 }, (_, i) =>
        makeAction(`act${i}`, `Result action ${i}`)
      );
      const tree = [makeGroup('cat', 'Category', manyLeaves)];
      const result = buildDisplayOptions({
        ...base,
        categoryTree: tree,
        options: tree,
        searchTerm: 'result',
        commands: [],
        jumpToStepEntries: [],
      });
      const actions = result.filter((o) => o.data?.menuItem?.kind === 'action');
      expect(actions).toHaveLength(15);
      const nav = result.find(
        (o) => o.data?.menuItem?.kind === 'nav' && o.data.menuItem.target === 'viewAll'
      );
      expect(nav).toBeUndefined();
    });

    it('shows matching commands', () => {
      const result = buildDisplayOptions({
        ...base,
        categoryTree: [],
        searchTerm: 'collapse',
      });
      const cmds = result.filter((o) => o.data?.menuItem?.kind === 'command');
      expect(cmds).toHaveLength(1);
      expect(cmds[0].label).toBe('Collapse all');
    });

    it('matches commands by description when label does not include the term', () => {
      const commands: EditorCommand[] = [
        ...mockCommands,
        {
          id: 'toggleEditorMode',
          label: 'Toggle graph editor',
          description: 'Switch between YAML and graph view',
          iconType: 'appGraph',
        },
      ];
      const result = buildDisplayOptions({ ...base, commands, searchTerm: 'yaml' });
      const cmds = result.filter((o) => o.data?.menuItem?.kind === 'command');
      expect(cmds).toHaveLength(1);
      expect(cmds[0].label).toBe('Toggle graph editor');
    });

    it('shows jump entries when search matches step names', () => {
      const result = buildDisplayOptions({
        ...base,
        categoryTree: [],
        searchTerm: 'step',
      });
      const jumps = result.filter((o) => o.data?.menuItem?.kind === 'jump');
      expect(jumps).toHaveLength(3);
    });

    it('shows viewExisting nav when some but not all jump entries match', () => {
      const result = buildDisplayOptions({
        ...base,
        categoryTree: [],
        searchTerm: 'alert',
      });
      const nav = result.find(
        (o) => o.data?.menuItem?.kind === 'nav' && o.data.menuItem.target === 'viewExisting'
      );
      expect(nav).toBeDefined();
    });

    it('does not show viewExisting when all jump entries match', () => {
      const result = buildDisplayOptions({
        ...base,
        categoryTree: [],
        searchTerm: 'step',
      });
      const nav = result.find(
        (o) => o.data?.menuItem?.kind === 'nav' && o.data.menuItem.target === 'viewExisting'
      );
      expect(nav).toBeUndefined();
    });

    it('does not show jump section when no entries match', () => {
      const result = buildDisplayOptions({
        ...base,
        categoryTree: [],
        searchTerm: 'zzz',
      });
      expect(groupLabels(result)).not.toContain('Jump to a step');
    });
  });
});
