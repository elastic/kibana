/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parseDocument } from 'yaml';
import type { WorkflowDetailDto } from '@kbn/workflows';
import { selectHasChanges } from './selectors';
import { seedCreateYaml, setCursorPosition, setWorkflow, setYamlString } from './slice';
import { createMockStore } from '../__mocks__/store.mock';

// Counts parses while still parsing for real.
jest.mock('yaml', () => {
  const actual = jest.requireActual('yaml');
  return { ...actual, parseDocument: jest.fn(actual.parseDocument) };
});

const mockWorkflow = {
  id: 'wf-1',
  yaml: 'name: Saved\ntriggers: []\nsteps: []\n',
} as WorkflowDetailDto;

const scaffold = `version: "1"
name: New workflow
enabled: false
description: This is a new workflow
triggers: []
steps: []
`;

describe('selectHasChanges', () => {
  it('is clean for a fresh create seed (empty scaffold)', () => {
    const store = createMockStore();
    store.dispatch(seedCreateYaml(scaffold));

    expect(selectHasChanges(store.getState())).toBe(false);
  });

  it('is dirty after adding structure to create YAML', () => {
    const store = createMockStore();
    store.dispatch(seedCreateYaml(scaffold));
    store.dispatch(
      setYamlString(`version: "1"
name: New workflow
enabled: false
description: This is a new workflow
triggers:
  - type: manual
steps: []
`)
    );

    expect(selectHasChanges(store.getState())).toBe(true);
  });

  it('is clean after add-then-delete leaves structurally empty YAML (triggers key dropped)', () => {
    const store = createMockStore();
    store.dispatch(seedCreateYaml(scaffold));
    // Mimics deleteTrigger dropping the triggers key when the last trigger is removed.
    store.dispatch(
      setYamlString(`version: "1"
name: New workflow
enabled: false
description: This is a new workflow
steps: []
`)
    );

    expect(selectHasChanges(store.getState())).toBe(false);
  });

  it.each([
    ['the name', scaffold.replace('name: New workflow', 'name: Renamed')],
    ['the description', scaffold.replace('This is a new workflow', 'Describes the goal')],
    ['the consts', scaffold.replace('triggers: []', 'consts:\n  limit: 5\ntriggers: []')],
    ['the tags', scaffold.replace('triggers: []', 'tags:\n  - prod\ntriggers: []')],
  ])('is dirty when only %s of a never-saved workflow changed', (_label, edited) => {
    const store = createMockStore();
    store.dispatch(seedCreateYaml(scaffold));
    store.dispatch(setYamlString(edited));

    expect(selectHasChanges(store.getState())).toBe(true);
  });

  it('is dirty when a renamed never-saved workflow also dropped its empty structure keys', () => {
    const store = createMockStore();
    store.dispatch(seedCreateYaml(scaffold));
    store.dispatch(setYamlString('version: "1"\nname: Renamed\nenabled: false\nsteps: []\n'));

    expect(selectHasChanges(store.getState())).toBe(true);
  });

  it('is dirty when a never-saved workflow no longer parses', () => {
    const store = createMockStore();
    store.dispatch(seedCreateYaml(scaffold));
    store.dispatch(setYamlString('name: [unclosed\n'));

    expect(selectHasChanges(store.getState())).toBe(true);
  });

  it('is clean again after reverting create YAML to the exact baseline', () => {
    const store = createMockStore();
    store.dispatch(seedCreateYaml(scaffold));
    store.dispatch(setYamlString(`${scaffold}# edited\n`));
    store.dispatch(setYamlString(scaffold));

    expect(selectHasChanges(store.getState())).toBe(false);
  });

  it('compares against saved workflow yaml, not create baseline', () => {
    const store = createMockStore();
    store.dispatch(seedCreateYaml('name: Create seed\n'));
    store.dispatch(setWorkflow(mockWorkflow));
    store.dispatch(setYamlString(mockWorkflow.yaml));

    expect(selectHasChanges(store.getState())).toBe(false);

    store.dispatch(setYamlString('name: Changed\n'));
    expect(selectHasChanges(store.getState())).toBe(true);
  });

  it('keeps saved workflows dirty even when structurally emptied', () => {
    const store = createMockStore();
    store.dispatch(
      setWorkflow({
        ...mockWorkflow,
        yaml: 'name: Saved\ntriggers:\n  - type: manual\nsteps: []\n',
      })
    );
    store.dispatch(setYamlString('name: Saved\nsteps: []\n'));

    expect(selectHasChanges(store.getState())).toBe(true);
  });

  it('treats unedited remix initialYaml as clean', () => {
    const store = createMockStore();
    const remix = 'name: From library\nsteps:\n  - name: a\n    type: console\n';
    store.dispatch(seedCreateYaml(remix));

    expect(selectHasChanges(store.getState())).toBe(false);
  });

  it('is dirty when every step of a remix scaffold was deleted', () => {
    const store = createMockStore();
    const remix = 'name: From library\nsteps:\n  - name: a\n    type: console\n';
    store.dispatch(seedCreateYaml(remix));
    store.dispatch(setYamlString('name: From library\nsteps: []\n'));

    expect(selectHasChanges(store.getState())).toBe(true);
  });

  it('does not parse the YAML again when something else in the detail state changes', () => {
    const store = createMockStore();
    store.dispatch(seedCreateYaml(scaffold));
    store.dispatch(setYamlString(`${scaffold}# edited\n`));
    selectHasChanges(store.getState());

    jest.mocked(parseDocument).mockClear();
    for (let line = 1; line <= 10; line++) {
      store.dispatch(setCursorPosition({ lineNumber: line, column: 1 }));
      selectHasChanges(store.getState());
    }
    expect(parseDocument).not.toHaveBeenCalled();
  });
});
