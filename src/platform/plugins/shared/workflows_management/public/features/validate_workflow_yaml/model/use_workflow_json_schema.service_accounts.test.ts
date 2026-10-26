/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { getLanguageService } from 'yaml-language-server';
import type { z } from '@kbn/zod/v4';
import { useWorkflowJsonSchema } from './use_workflow_json_schema';
import { useAvailableConnectors } from '../../../entities/connectors/model/use_available_connectors';
import { useKibana } from '../../../hooks/use_kibana';
import { createStartServicesMock, createUseKibanaMockValue } from '../../../mocks';

jest.mock('../../../entities/connectors/model/use_available_connectors');
jest.mock('../../../hooks/use_kibana');

const createLanguageService = (schema: z.core.JSONSchema.JSONSchema | null) => {
  expect(schema).not.toBeNull();
  const service = getLanguageService({
    schemaRequestService: async () => JSON.stringify(schema),
    workspaceContext: { resolveRelativePath: (relativePath) => relativePath },
  });
  service.configure({
    schemas: [{ fileMatch: ['*.yaml'], uri: 'test://workflow-schema.json' }],
    completion: true,
    validate: true,
  });
  return service;
};

let documentVersion = 0;

const complete = async (schema: z.core.JSONSchema.JSONSchema | null, yaml: string) => {
  const document = TextDocument.create('file:///workflow.yaml', 'yaml', ++documentVersion, yaml);
  const service = createLanguageService(schema);
  return service.doComplete(document, document.positionAt(yaml.length), false);
};

const workflowYaml = `name: Flag test
enabled: true
triggers:
  - type: manual
steps:
  - name: log
    type: console
    with:
      message: hello
`;

describe.each([false, true])('service account schema completions (loose=%s)', (loose) => {
  const services = createStartServicesMock();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useAvailableConnectors).mockReturnValue(undefined);
    jest.mocked(useKibana).mockReturnValue(createUseKibanaMockValue(services));
  });

  it.each([false, true])('gates run_as suggestions with the SA flag (%s)', async (enabled) => {
    services.security.serviceAccounts.isEnabled.mockReturnValue(enabled);
    const { result } = renderHook(() => useWorkflowJsonSchema({ loose }));
    const completions = await complete(result.current.jsonSchema, `${workflowYaml}settings:\n  `);
    const labels = completions?.items.map(({ label }) => label);
    expect(labels).toContain('timezone');
    if (enabled) {
      expect(labels).toContain('run_as');
    } else {
      expect(labels).not.toContain('run_as');
    }
  });

  it('does not insert run_as in the settings snippet when disabled', async () => {
    services.security.serviceAccounts.isEnabled.mockReturnValue(false);
    const { result } = renderHook(() => useWorkflowJsonSchema({ loose }));
    const completions = await complete(result.current.jsonSchema, `${workflowYaml}sett`);
    const settings = completions?.items.find(({ label }) => label === 'settings');
    expect(settings).toBeDefined();
    expect(JSON.stringify(settings)).not.toContain('run_as');
  });

  it('preserves schema validation for existing run_as values when disabled', async () => {
    services.security.serviceAccounts.isEnabled.mockReturnValue(false);
    const { result } = renderHook(() => useWorkflowJsonSchema({ loose }));
    const service = createLanguageService(result.current.jsonSchema);
    const document = TextDocument.create(
      'file:///existing.yaml',
      'yaml',
      1,
      `${workflowYaml}settings:\n  run_as: saved-account\n`
    );
    expect(await service.doValidation(document, false)).toEqual([]);
  });
});

describe.each(['workflow.execute', 'workflow.executeAsync'])(
  '%s identity completions',
  (stepType) => {
    const services = createStartServicesMock();
    const yaml = `name: Child execution
enabled: true
triggers:
  - type: manual
steps:
  - name: child
    type: ${stepType}
    with:
      workflow-id: child-id
`;

    beforeEach(() => {
      jest.clearAllMocks();
      jest.mocked(useAvailableConnectors).mockReturnValue(undefined);
      jest.mocked(useKibana).mockReturnValue(createUseKibanaMockValue(services));
    });

    it.each([
      [false, false],
      [false, true],
      [true, false],
      [true, true],
    ])('never suggests identity fields (SA=%s, loose=%s)', async (enabled, loose) => {
      services.security.serviceAccounts.isEnabled.mockReturnValue(enabled);
      const { result } = renderHook(() => useWorkflowJsonSchema({ loose }));
      const completions = await complete(result.current.jsonSchema, `${yaml}      `);
      const labels = completions?.items.map(({ label }) => label);
      expect(labels).toContain('inputs');
      expect(labels).not.toContain('inheritRunAs');
      expect(labels).not.toContain('run-as-mode');
    });

    it('rejects the removed inheritRunAs YAML property', async () => {
      services.security.serviceAccounts.isEnabled.mockReturnValue(true);
      const { result } = renderHook(() => useWorkflowJsonSchema());
      const service = createLanguageService(result.current.jsonSchema);
      const document = TextDocument.create(
        'file:///removed-alias.yaml',
        'yaml',
        ++documentVersion,
        `${yaml}      inheritRunAs: true\n`
      );
      const diagnostics = await service.doValidation(document, false);
      expect(diagnostics.some(({ message }) => message.includes('inheritRunAs'))).toBe(true);
    });

    it.each([false, true])('never suggests nested identity fields (SA=%s)', async (enabled) => {
      services.security.serviceAccounts.isEnabled.mockReturnValue(enabled);
      const { result } = renderHook(() => useWorkflowJsonSchema());
      const nestedYaml = yaml
        .replace(
          'steps:\n',
          'steps:\n  - name: loop\n    type: foreach\n    foreach: "{{ inputs.items }}"\n    steps:\n'
        )
        .replace(
          /^(  - name: child|    type: workflow\.execute.*|    with:|      workflow-id:.*)$/gm,
          '    $1'
        );
      const completions = await complete(result.current.jsonSchema, `${nestedYaml}          `);
      const labels = completions?.items.map(({ label }) => label);
      expect(labels).toContain('inputs');
      expect(labels).not.toContain('run-as-mode');
      expect(labels).not.toContain('inheritRunAs');
    });

    it('preserves validation of saved identity fields when suggestions are hidden', async () => {
      services.security.serviceAccounts.isEnabled.mockReturnValue(false);
      const { result } = renderHook(() => useWorkflowJsonSchema());
      const service = createLanguageService(result.current.jsonSchema);
      const document = TextDocument.create(
        'file:///existing.yaml',
        'yaml',
        1,
        `${yaml}      run-as-mode: inherit\n`
      );
      expect(await service.doValidation(document, false)).toEqual([]);
    });
  }
);
