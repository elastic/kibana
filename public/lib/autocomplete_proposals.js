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

function getAutocompleteProposalsForChain(chain) {
  return _.flatten(chain.map((fn, i) => (
    getAutocompleteProposalsForFnNode(fn, chain[i - 1])
  )));
}

/**
 * If the cursor is in this function, suggest function names, otherwise look
 * in the arguments for the cursor.
 */
function getAutocompleteProposalsForFnNode(fn, previousFn) {
  if (fn.cursor) {
    const previousFnName = _.get(previousFn, 'function');
    const previousFnDef = allFns.find(f => f.name === previousFnName);
    return getFunctionNameProposals(fn, _.get(previousFnDef, 'type'));
  } else {
    return _.flatten(_.map(fn.arguments, (args, name) => (
      getAutocompleteProposalsForArgNode(fn, args, name)
    )));
  }
}

/**
 * If the cursor is in this arg, suggest argument names and values. If this arg
 * has its own chain, look in the chain for the cursor.
 */
function getAutocompleteProposalsForArgNode(fn, args, name) {
  return _.flatten(args.map(arg => {
    if (arg.cursor) {
      return getArgumentProposals(fn, name, arg);
    } else if (arg.chain) {
      return getAutocompleteProposalsForChain(arg.chain);
    } else {
      return [];
    }
  }));
}

/**
 * Suggest function names based on what the previous function expects, filtered
 * by the given prefix and suffix.
 */
function getFunctionNameProposals(fn, previousFnType = 'null') {
  const { prefix, suffix, location } = fn;
  return allFns
    .filter(({ name }) => nameMatches(name, prefix, suffix))
    .filter(f => canCast(previousFnType, f.context.types))
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
function getArgumentProposals(fn, name, arg) {
  return _.flatten([
    (name === '_' ? getArgumentNameProposals(fn, arg) : []),
    getArgumentValueProposals(fn, name, arg),
  ]);
}

/**
 * Suggest argument names that this function expects, excluding unnamed
 * arguments and those which are already in use (unless they allow multiples),
 * filtered by the given prefix and suffix.
 */
function getArgumentNameProposals(fn, arg) {
  const { prefix, suffix, location } = arg;
  const fnDef = allFns.find(f => f.name === fn.function);
  const args = _.filter(fnDef.args, ({ name }) => name !== '_')
    .filter(({ name }) => nameMatches(name, prefix, suffix))
    .filter(({ name, multi }) => multi || !fn.arguments.hasOwnProperty(name));
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
function getArgumentValueProposals(/* fn, name, arg */) {
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
