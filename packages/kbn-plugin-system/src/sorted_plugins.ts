import { PluginSpec } from './plugin_spec';
import { PluginName } from './plugin';
import { topologicalSort } from './topological_sort';

// We need this helper for the types to be correct when creating Map
// (otherwise it assumes an array of A|B instead of a tuple [A,B])
const toTuple = <A, B>(a: A, b: B): [A, B] => [a, b];

function toSortable(plugins: Map<PluginName, PluginSpec<any, any, any>>) {
  const dependenciesByPlugin = [...plugins.entries()].map(([name, plugin]) =>
    toTuple(name, plugin.dependencies || [])
  );
  return new Map(dependenciesByPlugin);
}

/**
 * Sorts plugins in topological order based on dependencies
 */
export function getSortedPluginNames(
  plugins: Map<PluginName, PluginSpec<any, any, any>>
) {
  const sorted = topologicalSort(toSortable(plugins));
  return [...sorted];
}
