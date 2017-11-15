import _ from 'lodash';
import { parse } from '../../common/lib/grammar';
import { functionsRegistry } from './functions_registry';
import { typesRegistry } from './types_registry';

export function getCompletionProposals(expression, cursorPosition) {
  const cursor = '$cursor$';
  const cursoredInput = `${expression.substr(0, cursorPosition)}${cursor}${expression.substr(cursorPosition)}`;
  try {
    const { chain } = parse(cursoredInput, { parseCursor: true });
    return [
      ...getFunctionSuggestions(chain),
      ...getArgumentSuggestions(chain),
    ];
  } catch (e) {
    return [];
  }
}

function getFunctionSuggestions(chain) {
  const suggestionNode = chain.find(node => node.hasOwnProperty('suggest'));
  if (!suggestionNode) return [];
  const { prefix, suffix, location } = suggestionNode;
  const previousNode = chain[chain.indexOf(suggestionNode) - 1];
  const previousFunction = functionsRegistry.get(_.get(previousNode, 'function'));
  return functionsRegistry.toArray()
    .filter(fn => fn.name.startsWith(prefix || '') && fn.name.endsWith(suffix || ''))
    .filter(fn => canCast(previousFunction, fn.context.types))
    .map(fn => ({
      text: fn.name + ' ',
      description: fn.help,
      start: location.start.offset,
      end: location.end.offset - '$cursor$'.length,
      cursor: location.start.offset + fn.name.length + 1,
    }));
}

function getArgumentSuggestions(chain) {
  const suggestionNode = chain.find(node => node.arguments && node.arguments.hasOwnProperty('$cursor$'));
  if (!suggestionNode) return [];
  const { prefix, suffix, location } = suggestionNode.arguments.$cursor$;
  const fn = functionsRegistry.get(suggestionNode.function);
  return Object.keys(fn.args)
    .filter(name => !suggestionNode.arguments.hasOwnProperty(name))
    .filter(name => name !== '_' && name.startsWith(prefix || '') && name.endsWith(suffix || ''))
    .map(name => ({
      text: name + '=',
      start: location.start.offset,
      end: location.end.offset - '$cursor$'.length,
      cursor: location.start.offset + name.length + 1,
    }));
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
