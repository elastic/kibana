import { dryRun } from './dry_run';
import { buildMigrationState } from './migration_helpers';
import { mockCluster } from './test/mock_cluster';

describe('dryRun', () => {
  const log = () => {};

  test('is empty if there are no migrations to be run', async () => {
    const plugins = [];
    const index = '.amazemazing';
    const callCluster = mockCluster({});
    const actual = await dryRun({ callCluster, index, plugins, log });
    expect(actual).toEqual({ migrations: [] });
  });

  test('handles plugins that have no migrations or mappings', async () => {
    const plugins = [{
      id: 'bon',
      migrations: [{ id: 'derp' }],
    }, {
      id: 'mal',
    }];
    const index = '.amazemazing';
    const callCluster = mockCluster({});
    const actual = await dryRun({ callCluster, index, plugins, log });
    expect(actual).toEqual({
      migrations: [{ id: 'derp', pluginId: 'bon' }],
    });
  });

  test('is empty if migrations are unchanged', async () => {
    const plugins = [{
      id: 'bon',
      mappings: {
        merlin: { type: 'wizard' },
      },
      migrations: [{ id: 'bingo' }],
    }];
    const state = buildMigrationState(plugins);
    const index = '.amazemazing';
    const callCluster = mockCluster({
      [index]: {
        'migration:migration-state': {
          _source: {
            migration: state
          },
        },
      },
    });
    const actual = await dryRun({ callCluster, index, plugins, log });
    expect(actual).toEqual({ migrations: [] });
  });

  test('lists only new migrations', async () => {
    const plugins = [{
      id: 'bon',
      mappings: {
        merlin: { type: 'wizard' },
      },
      migrations: [{ id: 'bingo' }],
    }];
    const state = buildMigrationState(plugins);
    const index = '.amazemazing';
    const callCluster = mockCluster({
      [index]: {
        'migration:migration-state': {
          _source: {
            migration: state
          },
        },
      },
    });
    plugins[0].migrations.push({ id: 'fancipants' });
    const actual = await dryRun({ callCluster, index, plugins, log });
    expect(actual).toEqual({
      migrations: [{ pluginId: 'bon', id: 'fancipants' }],
    });
  });

  test('disabled plugins have no affect on the dry run', async () => {
    const plugins = [{
      id: 'bon',
      mappings: {
        merlin: { type: 'wizard' },
      },
      migrations: [{ id: 'bingo' }],
    }, {
      id: 'wart',
      mappings: {
        wart: { type: 'king' },
      },
      migrations: [{ id: 'arthur' }],
    }];
    const state = buildMigrationState(plugins);
    const index = '.amazemazing';
    const callCluster = mockCluster({
      [index]: {
        'migration:migration-state': {
          _source: {
            migration: state
          },
        },
      },
    });
    const actual = await dryRun({ callCluster, index, log, plugins: [plugins[1]] });
    expect(actual).toEqual({ migrations: [] });
  });
});
