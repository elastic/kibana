/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { collectAllStepPropertyItems } from './collect_all_step_property_items';
import { performComputation } from '../../../entities/workflows/store/workflow_detail/utils/computation';

describe('collectAllStepPropertyItems', () => {
  it('should collect zero step property items from steps if no handlers exist in schemas', () => {
    const yaml = `
name: test-workflow
steps:
  - name: run-agent
    type: run-agent
    agent-id: 123
    with:
      message: "Hello, world!"
`;
    const getPropertyHandler = jest.fn();
    const computedData = performComputation(yaml);
    const { workflowLookup, yamlLineCounter } = computedData;
    const stepPropertyItems = collectAllStepPropertyItems(
      workflowLookup!,
      yamlLineCounter!,
      getPropertyHandler
    );
    expect(stepPropertyItems).toHaveLength(0);
  });
  it('should collect step property items at step level from steps if handlers exist in schemas', () => {
    const yaml = `
name: test-workflow
steps:
  - name: run-agent
    type: run-agent
    agent-id: great-agent
    with:
      message: "Hello, world!"
`;
    const { workflowLookup, yamlLineCounter } = performComputation(yaml.trim());
    const selectionHandler = {
      search: jest.fn(),
      resolve: jest.fn(),
      getDetails: jest.fn(),
    };
    const getPropertyHandler = jest.fn();
    getPropertyHandler.mockImplementation(
      (stepType: string, scope: 'config' | 'input', key: string) => {
        if (stepType === 'run-agent' && scope === 'config' && key === 'agent-id') {
          return { selection: selectionHandler };
        }
        return null;
      }
    );
    const stepPropertyItems = collectAllStepPropertyItems(
      workflowLookup!,
      yamlLineCounter!,
      getPropertyHandler
    );
    expect(stepPropertyItems).toHaveLength(1);
    expect(stepPropertyItems[0]).toMatchObject({
      propertyKey: 'agent-id',
      propertyValue: 'great-agent',
      stepType: 'run-agent',
      scope: 'config',
      selectionHandler,
      yamlPath: ['agent-id'],
      key: 'agent-id',
    });
  });
  it('should collect step property items at "with" level if handlers exist in schemas', () => {
    const yaml = `
name: test-workflow
steps:
  - name: run-agent
    type: run-agent
    with:
      message: "Hello, world!"
      debug: true
`;
    const { workflowLookup, yamlLineCounter } = performComputation(yaml.trim());
    const selectionHandler = {
      search: jest.fn(),
      resolve: jest.fn(),
      getDetails: jest.fn(),
    };
    const getPropertyHandler = jest.fn();
    getPropertyHandler.mockImplementation(
      (stepType: string, scope: 'config' | 'input', key: string) => {
        if (stepType === 'run-agent' && scope === 'input' && key === 'debug') {
          return { selection: selectionHandler };
        }
        return null;
      }
    );
    const stepPropertyItems = collectAllStepPropertyItems(
      workflowLookup!,
      yamlLineCounter!,
      getPropertyHandler
    );
    expect(stepPropertyItems).toHaveLength(1);
    expect(stepPropertyItems[0]).toMatchObject({
      propertyKey: 'debug',
      propertyValue: true,
      stepType: 'run-agent',
      scope: 'input',
      selectionHandler,
      yamlPath: ['with', 'debug'],
      key: 'debug',
    });
  });
  it('should collect nested step property items at both config and input level', () => {
    const yaml = `
name: test-workflow
steps:
  - name: run-agent
    type: run-agent
    agent-config:
      agent:
        id: great-agent
    with:
      obj:
        message: "Hello, world!"
`;
    const { workflowLookup, yamlLineCounter } = performComputation(yaml.trim());
    const selectionHandler1 = {
      search: jest.fn(),
      resolve: jest.fn(),
      getDetails: jest.fn(),
    };
    const selectionHandler2 = {
      search: jest.fn(),
      resolve: jest.fn(),
      getDetails: jest.fn(),
    };
    const getPropertyHandler = jest.fn();
    getPropertyHandler.mockImplementation(
      (stepType: string, scope: 'config' | 'input', key: string) => {
        if (stepType === 'run-agent' && scope === 'input' && key === 'obj.message') {
          return { selection: selectionHandler1 };
        }
        if (stepType === 'run-agent' && scope === 'config' && key === 'agent-config.agent.id') {
          return { selection: selectionHandler2 };
        }
        return null;
      }
    );
    const stepPropertyItems = collectAllStepPropertyItems(
      workflowLookup!,
      yamlLineCounter!,
      getPropertyHandler
    );
    expect(stepPropertyItems).toHaveLength(2);
    expect(stepPropertyItems[0]).toMatchObject({
      propertyKey: 'agent-config.agent.id',
      propertyValue: 'great-agent',
      stepType: 'run-agent',
      scope: 'config',
      selectionHandler: selectionHandler2,
      yamlPath: ['agent-config', 'agent', 'id'],
      key: 'id',
    });
    expect(stepPropertyItems[1]).toMatchObject({
      propertyKey: 'obj.message',
      propertyValue: 'Hello, world!',
      stepType: 'run-agent',
      scope: 'input',
      selectionHandler: selectionHandler1,
      yamlPath: ['with', 'obj', 'message'],
      key: 'message',
    });
  });

  it('should use empty context.values when selection has no dependsOnValues', () => {
    const yaml = `
name: test-workflow
steps:
  - name: run-agent
    type: run-agent
    extra: x
`;
    const { workflowLookup, yamlLineCounter } = performComputation(yaml.trim());
    const selectionHandler = {
      search: jest.fn(),
      resolve: jest.fn(),
      getDetails: jest.fn(),
    };
    const getPropertyHandler = jest.fn(
      (stepType: string, scope: 'config' | 'input', key: string) => {
        if (stepType === 'run-agent' && scope === 'config' && key === 'extra') {
          return { selection: selectionHandler };
        }
        return null;
      }
    );
    const stepPropertyItems = collectAllStepPropertyItems(
      workflowLookup!,
      yamlLineCounter!,
      getPropertyHandler
    );
    expect(stepPropertyItems[0].context.values).toEqual({ config: {}, input: {} });
  });

  it('should pass filtered context.values when dependsOnValues is set', () => {
    const yaml = `
name: test-workflow
steps:
  - name: run-agent
    type: run-agent
    proxy:
      id: p1
      ssl: true
    other: ignored
`;
    const { workflowLookup, yamlLineCounter } = performComputation(yaml.trim());
    const selectionHandler = {
      dependsOnValues: ['config.proxy.ssl', 'config.other'] as any,
      search: jest.fn(),
      resolve: jest.fn(),
      getDetails: jest.fn(),
    };
    const getPropertyHandler = jest.fn(
      (stepType: string, scope: 'config' | 'input', key: string) => {
        if (stepType === 'run-agent' && scope === 'config' && key === 'proxy.id') {
          return { selection: selectionHandler };
        }
        return null;
      }
    );
    const stepPropertyItems = collectAllStepPropertyItems(
      workflowLookup!,
      yamlLineCounter!,
      getPropertyHandler
    );
    expect(stepPropertyItems).toHaveLength(1);
    expect(stepPropertyItems[0].context.values).toEqual({
      config: { other: 'ignored', proxy: { ssl: true } },
      input: {},
    });
  });

  it('should collect step property items for internal steps like elasticsearch.search when resolver returns a handler', () => {
    const yaml = `
name: test-workflow
steps:
  - name: es-search
    type: elasticsearch.search
    with:
      index: my-index
`;
    const { workflowLookup, yamlLineCounter } = performComputation(yaml.trim());
    const selectionHandler = {
      search: jest.fn(),
      resolve: jest.fn(),
      getDetails: jest.fn(),
    };
    const getPropertyHandler = jest.fn(
      (stepType: string, scope: 'config' | 'input', key: string) => {
        if (stepType === 'elasticsearch.search' && scope === 'input' && key === 'index') {
          return { selection: selectionHandler };
        }
        return null;
      }
    );
    const esStepPropertyItems = collectAllStepPropertyItems(
      workflowLookup!,
      yamlLineCounter!,
      getPropertyHandler
    );
    expect(esStepPropertyItems).toHaveLength(1);
    expect(esStepPropertyItems[0]).toMatchObject({
      propertyKey: 'index',
      propertyValue: 'my-index',
      stepType: 'elasticsearch.search',
      scope: 'input',
      selectionHandler,
      yamlPath: ['with', 'index'],
      key: 'index',
    });
  });
});
