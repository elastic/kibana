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
  if (start !== end) return [];
  const cursoredInput = value.substr(0, end) + cursor + value.substr(end);
  try {
    const { chain } = parse(cursoredInput, { parseCursor: true });
    return [
      ...getFunctionProposals(chain),
      ...getArgumentProposals(chain),
    ];
  } catch (e) {
    return [];
  }
}

function getFunctionProposals(chain) {
  const suggestionNode = chain.find(node => node.hasOwnProperty(cursor));
  if (!suggestionNode) return [];
  const { prefix, suffix, location } = suggestionNode;
  const previousNode = chain[chain.indexOf(suggestionNode) - 1];
  const previousFunction = functionsRegistry.get(_.get(previousNode, 'function'));
  return allFns
    .filter(({ name }) => nameMatches(name, prefix, suffix))
    .filter(fn => canCast(previousFunction, fn.context.types))
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

function getArgumentProposals(chain) {
  const suggestionNode = chain.find(node => node.arguments && node.arguments.hasOwnProperty(cursor));
  if (!suggestionNode) return [];
  const { prefix, suffix, location } = suggestionNode.arguments[cursor];
  const fn = allFns.find(fn => fn.name === suggestionNode.function);
  const proposals = _.filter(fn.args, (arg, name) => !suggestionNode.arguments.hasOwnProperty(name))
    .filter(({ name }) => name !== '_' && nameMatches(name, prefix, suffix));
  return _.uniqBy(proposals, 'name')
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

function nameMatches(name, prefix, suffix) {
  return name.startsWith(prefix || '') && name.endsWith(suffix || '');
}

function canCast(fn, toTypeNames) {
  const fromTypeName = _.get(fn, 'type') || 'null';
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
