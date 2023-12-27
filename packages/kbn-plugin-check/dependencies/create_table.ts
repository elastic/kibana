/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Table, { Table as TableType } from 'cli-table3';

import colors from 'colors/safe';

import { ToolingLog } from '@kbn/tooling-log';

import { PluginLayer, PluginLifecycle, PluginInfo, PluginStatuses, PluginState } from '../types';
import { PLUGIN_LAYERS, PLUGIN_LIFECYCLES } from '../const';
import { borders } from './table_borders';

// A lot of this logic is brute-force and ugly. It's a quick and dirty way to get the
// proof-of-concept working.
export const createTable = (
  pluginInfo: PluginInfo,
  statuses: PluginStatuses,
  _log: ToolingLog
): TableType => {
  const table = new Table({
    colAligns: ['left', 'center', 'center', 'center', 'center', 'center', 'center'],
    style: {
      'padding-left': 2,
      'padding-right': 2,
    },
    chars: borders.table,
  });

  const noDependencies = Object.keys(statuses).length === 0;
  const noServerPlugin = pluginInfo.classes.server === null;
  const noClientPlugin = pluginInfo.classes.client === null;
  const noPlugins = noServerPlugin && noClientPlugin;

  if (noDependencies || noPlugins) {
    table.push([pluginInfo.name]);

    if (noDependencies) {
      table.push(['Plugin has no dependencies.']);
    }

    if (noPlugins)
      table.push([
        'Plugin has no client or server implementation.\nIt should be migrated to a package, or only be a requiredBundle.',
      ]);

    return table;
  }

  /**
   * Build and format the header cell for the plugin lifecycle column.
   */
  const getLifecycleColumnHeader = (layer: PluginLayer, lifecycle: PluginLifecycle) =>
    Object.entries(statuses).some(
      ([_name, statusObj]) => statusObj[layer][lifecycle].source === 'none'
    )
      ? colors.red(lifecycle.toUpperCase())
      : lifecycle.toUpperCase();

  /**
   * Build and format the header cell for the plugin layer column.
   */
  const getLayerColumnHeader = (layer: PluginLayer) => {
    if (!pluginInfo.classes[layer]) {
      return [
        {
          colSpan: 2,
          content: 'NO CLASS',
          chars: borders.subheader,
        },
      ];
    }

    return PLUGIN_LIFECYCLES.map((lifecycle) => ({
      content: getLifecycleColumnHeader(layer, lifecycle),
      chars: borders.subheader,
    }));
  };

  /**
   * True if the `PluginState` is one of the states that should be excluded from a
   * mismatch check.
   */
  const isExcludedState = (state: PluginState) =>
    state === 'no class' || state === 'unknown' || state === 'missing';

  const entries = Object.entries(statuses);
  let hasPass = false;
  let hasFail = false;
  let hasWarn = false;

  // Table Header
  table.push([
    {
      colSpan: 3,
      content: pluginInfo.name,
      chars: borders.header,
    },
    {
      colSpan: 2,
      content: 'SERVER',
      chars: borders.header,
    },
    {
      colSpan: 2,
      content: 'PUBLIC',
      chars: borders.header,
    },
  ]);

  // Table Subheader
  table.push([
    {
      content: '',
      chars: borders.subheader,
    },
    {
      content: 'DEPENDENCY',
      chars: borders.subheader,
    },
    {
      content: 'MANIFEST',
      chars: borders.subheader,
    },
    ...getLayerColumnHeader('server'),
    ...getLayerColumnHeader('client'),
  ]);

  // Dependency Rows
  entries
    .sort(([nameA], [nameB]) => {
      return nameA.localeCompare(nameB);
    })
    .forEach(([name, statusObj], index) => {
      const { manifestState /* server, client*/ } = statusObj;
      const chars = index === entries.length - 1 ? borders.lastDependency : {};
      const states = PLUGIN_LAYERS.flatMap((layer) =>
        PLUGIN_LIFECYCLES.flatMap((lifecycle) => statusObj[layer][lifecycle].pluginState)
      );

      // TODO: Clean all of this brute-force stuff up.
      const getLifecycleCellContent = (state: string) => {
        if (state === 'no class' || (manifestState === 'bundle' && state === 'missing')) {
          return '';
        } else if (manifestState === 'bundle' || (manifestState !== state && state !== 'missing')) {
          return colors.red(state === 'missing' ? '' : state);
        }

        return state === 'missing' ? '' : state;
      };

      const hasNoMismatch = () =>
        states.some((state) => state === manifestState) &&
        states.filter((state) => state !== manifestState).every(isExcludedState);

      const isValidBundle = () => manifestState === 'bundle' && states.every(isExcludedState);

      const getStateLabel = () => {
        if (hasNoMismatch() || isValidBundle()) {
          hasPass = true;
          return '✅';
        } else if (!hasNoMismatch()) {
          hasFail = true;
          return '❌';
        }

        hasWarn = true;
        return '❓';
      };

      const getLifecycleColumns = () => {
        if (noClientPlugin && noServerPlugin) {
          return [{ colSpan: 4, content: '' }];
        }

        return PLUGIN_LAYERS.flatMap((layer) => {
          if (!pluginInfo.classes[layer]) {
            return { colSpan: 2, content: '', chars };
          }

          return PLUGIN_LIFECYCLES.flatMap((lifecycle) => ({
            content: getLifecycleCellContent(statusObj[layer][lifecycle].pluginState),
            chars,
          }));
        });
      };

      table.push({
        [getStateLabel()]: [
          { content: name, chars },
          {
            content:
              manifestState === 'missing' ? colors.red(manifestState.toUpperCase()) : manifestState,
            chars,
          },
          ...getLifecycleColumns(),
        ],
      });
    });

  table.push([
    {
      colSpan: 7,
      content: `${hasWarn ? '❓ - dependency is entirely missing or unknown.\n' : ''}${
        hasFail ? '❌ - dependency differs from the manifest.\n' : ''
      }${hasPass ? '✅ - dependency matches the manifest.' : ''}`,
      chars: borders.footer,
    },
  ]);

  return table;
};
