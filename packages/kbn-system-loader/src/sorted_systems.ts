import { System } from './system';
import { SystemName } from './system_types';
import { topologicalSort } from './topological_sort';

// We need this helper for the types to be correct when creating Map
// (otherwise it assumes an array of A|B instead of a tuple [A,B])
const toTuple = <A, B>(a: A, b: B): [A, B] => [a, b];

function toSortable(systems: Map<SystemName, System<any, any, any, any>>) {
  const dependenciesBySystem = [...systems.entries()].map(([name, system]) =>
    toTuple(name, system.dependencies || [])
  );
  return new Map(dependenciesBySystem);
}

/**
 * Sorts systems in topological order based on dependencies
 */
export function getSortedSystemNames(
  systems: Map<SystemName, System<any, any, any, any>>
) {
  const sorted = topologicalSort(toSortable(systems));
  return [...sorted];
}
