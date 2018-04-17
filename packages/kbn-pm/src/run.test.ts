import { resolve } from 'path';
import { runCommand } from './run';
import { Project } from './utils/project';
import { Command, CommandConfig } from './commands';

const rootPath = resolve(`${__dirname}/utils/__fixtures__/kibana`);

function getExpectedProjectsAndGraph(runMock: any) {
  const [fullProjects, fullProjectGraph] = (runMock as jest.Mock<
    any
  >).mock.calls[0];

  const projects = [...fullProjects.keys()].sort();

  const graph = [...fullProjectGraph.entries()].reduce(
    (expected, [projectName, dependencies]) => {
      expected[projectName] = dependencies.map(
        (project: Project) => project.name
      );
      return expected;
    },
    {}
  );

  return { projects, graph };
}

let command: Command;
let config: CommandConfig;
beforeEach(() => {
  command = {
    name: 'test name',
    description: 'test description',
    run: jest.fn(),
  };

  config = {
    extraArgs: [],
    options: {},
    rootPath,
  };

  // Reduce the noise that comes from the run command.
  jest.spyOn(console, 'log').mockImplementation(() => {});
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
  let mockProcessExit = jest
    .spyOn(process, 'exit')
    .mockImplementation(() => {});

  await runCommand(command, {
    ...config,
    // Including and excluding the same project will result in 0 projects selected.
    options: { include: ['foo'], exclude: ['foo'] },
  });

  expect(command.run).not.toHaveBeenCalled();
  expect(mockProcessExit).toHaveBeenCalledWith(1);
});
