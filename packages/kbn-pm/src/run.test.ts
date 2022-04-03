/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { resolve } from 'path';

import { ICommand, ICommandConfig } from './commands';
import { runCommand } from './run';
import { Project } from './utils/project';
import { log } from './utils/log';

log.setLogLevel('silent');

const rootPath = resolve(__dirname, 'utils/__fixtures__/kibana');

jest.mock('./utils/regenerate_package_json');
jest.mock('./utils/regenerate_synthetic_package_map');
jest.mock('./utils/regenerate_base_tsconfig');

function getExpectedProjectsAndGraph(runMock: any) {
  const [fullProjects, fullProjectGraph] = (runMock as jest.Mock<any>).mock.calls[0];

  const projects = [...fullProjects.keys()].sort();

  const graph = [...fullProjectGraph.entries()].reduce((expected, [projectName, dependencies]) => {
    expected[projectName] = dependencies.map((project: Project) => project.name);
    return expected;
  }, {});

  return { projects, graph };
}

let command: ICommand;
let config: Omit<ICommandConfig, 'kbn'>;
beforeEach(() => {
  command = {
    description: 'test description',
    name: 'test name',
    run: jest.fn(),
  };

  config = {
    extraArgs: [],
    options: {},
    rootPath,
  };
});

test('passes all found projects to the command if no filter is specified', async () => {
  await runCommand(command, config);

  expect(command.run).toHaveBeenCalledTimes(1);
  expect(getExpectedProjectsAndGraph(command.run)).toMatchSnapshot();
});

test('excludes project if single `exclude` filter is specified', async () => {
  await runCommand(command, {
    ...config,
    options: { exclude: 'foo' },
  });

  expect(command.run).toHaveBeenCalledTimes(1);
  expect(getExpectedProjectsAndGraph(command.run)).toMatchSnapshot();
});

test('excludes projects if multiple `exclude` filter are specified', async () => {
  await runCommand(command, {
    ...config,
    options: { exclude: ['foo', 'bar', 'baz'] },
  });

  expect(command.run).toHaveBeenCalledTimes(1);
  expect(getExpectedProjectsAndGraph(command.run)).toMatchSnapshot();
});

test('includes single project if single `include` filter is specified', async () => {
  await runCommand(command, {
    ...config,
    options: { include: 'foo' },
  });

  expect(command.run).toHaveBeenCalledTimes(1);
  expect(getExpectedProjectsAndGraph(command.run)).toMatchSnapshot();
});

test('includes only projects specified in multiple `include` filters', async () => {
  await runCommand(command, {
    ...config,
    options: { include: ['foo', 'bar', 'baz'] },
  });

  expect(command.run).toHaveBeenCalledTimes(1);
  expect(getExpectedProjectsAndGraph(command.run)).toMatchSnapshot();
});

test('respects both `include` and `exclude` filters if specified at the same time', async () => {
  await runCommand(command, {
    ...config,
    options: { include: ['foo', 'bar', 'baz'], exclude: 'bar' },
  });

  expect(command.run).toHaveBeenCalledTimes(1);
  expect(getExpectedProjectsAndGraph(command.run)).toMatchSnapshot();
});

test('does not run command if all projects are filtered out', async () => {
  const mockProcessExit = jest.spyOn(process, 'exit').mockReturnValue(undefined as never);

  await runCommand(command, {
    ...config,
    // Including and excluding the same project will result in 0 projects selected.
    options: { include: ['foo'], exclude: ['foo'] },
  });

  expect(command.run).not.toHaveBeenCalled();
  expect(mockProcessExit).toHaveBeenCalledWith(1);
});
