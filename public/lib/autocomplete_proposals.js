import _ from 'lodash';
import { parse } from '../../common/lib/grammar';
import { functionsRegistry } from './functions_registry';
import { typesRegistry } from './types_registry';
import { getServerFunctions } from './interpreter';

const cursor = '$cursor$';
let allFns;
getServerFunctions.then(fns => {
  allFns = _.uniqBy([
    ...functionsRegistry.toArray(),
    ...Object.values(fns),
  ], 'name');
});

export function getAutocompleteProposals({ value, selection }) {
  const { start, end } = selection;

  // Don't propose anything when there is a multi-character selection
  if (start !== end) return [];

  const cursoredInput = value.substr(0, end) + cursor + value.substr(end);
  try {
    const { chain } = parse(cursoredInput, { parseCursor: true });
    return getAutocompleteProposalsForChain(chain);
  } catch (e) {
    return [];
  }
}

/**
 * Traverse the chain until we find the node at the cursor. If the node is in
 * place of a function node, suggest functions. If it is in place of an
 * argument node, suggest arguments. Otherwise, don't suggest anything.
 */
function getAutocompleteProposalsForChain(chain) {
  for (let i = 0; i < chain.length; i++) {
    const fn = chain[i];
    if (fn.cursor) {
      return getFunctionNameProposals(chain, i);
    }
    for (const key in (fn.arguments || {})) {
      if (!fn.arguments.hasOwnProperty(key)) continue;
      const args = fn.arguments[key];
      for (let j = 0; j < args.length; j++) {
        if (args[j].cursor) {
          return getArgumentProposals(chain, i, key, j);
        } else if (args[j].chain) {
          return getAutocompleteProposalsForChain(args[j].chain);
        }
      }
    }
  }
  return [];
}

/**
 * Suggest function names based on what the previous function expects, filtered
 * by the given prefix and suffix.
 */
function getFunctionNameProposals(chain, index) {
  const { prefix, suffix, location } = chain[index];
  const previousFnType = (index === 0)
    ? 'null'
    : allFns.find(fn => fn.name === chain[index - 1].function).type;
  return allFns
    .filter(({ name }) => nameMatches(name, prefix, suffix))
    .filter(fn => canCast(previousFnType, fn.context.types))
    .map(({ name, help }) => ({
      value: name + ' ',
      name: name,
      description: help,
      location: {
        start: location.start.offset,
        end: location.end.offset - cursor.length,
      },
    }));
}

/**
 * If we are dealing with a named argument, only suggest the corresponding
 * argument values. If it's unnamed, also suggest argument names.
 */
function getArgumentProposals(chain, fnIndex, argKey, argIndex) {
  return [
    ...(argKey === '_' ? getArgumentNameProposals(chain, fnIndex, argKey, argIndex) : []),
    ...getArgumentValueProposals(chain, fnIndex, argKey, argIndex),
  ];
}

/**
 * Suggest argument names that this function expects, excluding unnamed
 * arguments and those which are already in use (unless they allow multiples),
 * filtered by the given prefix and suffix.
 */
function getArgumentNameProposals(chain, fnIndex, argKey, argIndex) {
  const { prefix, suffix, location } = chain[fnIndex].arguments[argKey][argIndex];
  const fn = allFns.find(fn => fn.name === chain[fnIndex].function);
  const args = _.filter(fn.args, ({ name }) => name !== '_')
    .filter(({ name }) => nameMatches(name, prefix, suffix))
    .filter(({ name, multi }) => multi || !chain[fnIndex].arguments.hasOwnProperty(name));
  return _.uniqBy(args, 'name')
    .map(({ name, help }) => ({
      value: name + '=',
      name: name,
      description: help,
      location: {
        start: location.start.offset,
        end: location.end.offset - cursor.length,
      },
    }));
}

/**
 * Defer to the function definition itself to suggest values.
 */
function getArgumentValueProposals(/* chain, fnIndex, argKey, argIndex */) {
  // TODO: Implement this
  return [];
}

function nameMatches(name, prefix, suffix) {
  return name.startsWith(prefix || '') && name.endsWith(suffix || '');
}

function canCast(fromTypeName = 'null', toTypeNames) {
  if (_.includes(toTypeNames, fromTypeName)) return true;

  const fromTypeDef = typesRegistry.get(fromTypeName);

  // First check if this object can make itself into any of the targets
  if (fromTypeDef && fromTypeDef.castsTo(toTypeNames)) return true;

  // If that isn't possible, filter the valid types to ones that can create themselves from fromTypeName
  return _.find(toTypeNames, toTypeName => {
    const toTypeDef = typesRegistry.get(toTypeName);
    return toTypeDef && toTypeDef.castsFrom([fromTypeName]);
  });
}
