/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Flags a Promise.race deadline whose setTimeout is never cleared.
 *
 * The timer callback, and anything it closes over, stays on the heap until the
 * timeout fires. clearTimeout, or withTimeout from @kbn/std, drops that graph
 * when the race settles. A race may still wait on abort or shutdown as well.
 */

const MESSAGE =
  'Clear this Promise.race deadline with clearTimeout, or use withTimeout from @kbn/std, which clears the timer when the race settles. Other race arms, such as abort or shutdown, can stay.';

const FUNCTION_TYPES = new Set([
  'FunctionDeclaration',
  'FunctionExpression',
  'ArrowFunctionExpression',
]);

const UNWRAP_TYPES = new Set([
  'AwaitExpression',
  'ChainExpression',
  'ParenthesizedExpression',
  'TSAsExpression',
  'TSNonNullExpression',
  'TSSatisfiesExpression',
  'TSTypeAssertion',
]);

/**
 * @param {any} node
 * @returns {any[]}
 */
function childNodes(node) {
  /** @type {any[]} */
  const children = [];
  for (const key of Object.keys(node)) {
    if (key === 'parent') {
      continue;
    }
    const value = node[key];
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item && typeof item.type === 'string') {
          children.push(item);
        }
      }
    } else if (value && typeof value.type === 'string') {
      children.push(value);
    }
  }
  return children;
}

/**
 * @param {any} root
 */
function linkParents(root) {
  const stack = [root];
  while (stack.length > 0) {
    const node = stack.pop();
    for (const child of childNodes(node)) {
      child.parent = node;
      stack.push(child);
    }
  }
}

/**
 * @param {any} node
 * @param {(node: any) => void} visit
 * @param {boolean} enterNestedFunctions
 */
function walk(node, visit, enterNestedFunctions) {
  if (!enterNestedFunctions && FUNCTION_TYPES.has(node.type)) {
    return;
  }
  visit(node);
  for (const child of childNodes(node)) {
    if (!enterNestedFunctions && FUNCTION_TYPES.has(child.type)) {
      continue;
    }
    walk(child, visit, enterNestedFunctions);
  }
}

/**
 * @param {any} node
 */
function unwrap(node) {
  let current = node;
  while (current && UNWRAP_TYPES.has(current.type)) {
    current = current.expression || current.argument;
  }
  return current;
}

/**
 * @param {any} node
 * @returns {string | undefined}
 */
function calleeName(node) {
  if (!node) {
    return;
  }
  if (node.type === 'Identifier') {
    return node.name;
  }
  if (
    node.type === 'MemberExpression' &&
    !node.computed &&
    node.property &&
    node.property.type === 'Identifier'
  ) {
    return node.property.name;
  }
}

/**
 * @param {any} node
 */
function isPromiseRace(node) {
  return (
    node.type === 'CallExpression' &&
    node.callee &&
    node.callee.type === 'MemberExpression' &&
    !node.callee.computed &&
    calleeName(node.callee) === 'race' &&
    node.callee.object &&
    node.callee.object.type === 'Identifier' &&
    node.callee.object.name === 'Promise'
  );
}

/**
 * @param {any} node
 */
function isNewPromise(node) {
  return (
    node &&
    node.type === 'NewExpression' &&
    node.callee &&
    node.callee.type === 'Identifier' &&
    node.callee.name === 'Promise' &&
    node.arguments &&
    node.arguments.length > 0 &&
    FUNCTION_TYPES.has(node.arguments[0].type)
  );
}

/**
 * @param {any} node
 */
function isSetTimeoutCall(node) {
  return node.type === 'CallExpression' && calleeName(node.callee) === 'setTimeout';
}

/**
 * Scope that directly contains `node`, not `node` itself.
 *
 * @param {any} node
 * @returns {any}
 */
function enclosingScope(node) {
  let current = node.parent;
  while (current) {
    if (FUNCTION_TYPES.has(current.type) || current.type === 'Program') {
      return current;
    }
    current = current.parent;
  }
  return node;
}

/** @type {WeakMap<any, Set<string>>} */
const bindingNameCache = new WeakMap();

/** @type {WeakMap<any, number>} */
const scopeIds = new WeakMap();

let nextScopeId = 1;

/**
 * @param {any} scope
 * @returns {number}
 */
function scopeId(scope) {
  const existing = scopeIds.get(scope);
  if (existing) {
    return existing;
  }
  const id = nextScopeId++;
  scopeIds.set(scope, id);
  return id;
}

/**
 * @param {any} pattern
 * @param {Set<string>} names
 */
function collectPatternNames(pattern, names) {
  if (!pattern) {
    return;
  }
  if (pattern.type === 'Identifier') {
    names.add(pattern.name);
    return;
  }
  if (pattern.type === 'AssignmentPattern' || pattern.type === 'RestElement') {
    collectPatternNames(pattern.left || pattern.argument, names);
    return;
  }
  if (pattern.type === 'ArrayPattern') {
    for (const element of pattern.elements) {
      collectPatternNames(element, names);
    }
    return;
  }
  if (pattern.type === 'ObjectPattern') {
    for (const property of pattern.properties) {
      if (property.type === 'RestElement') {
        collectPatternNames(property.argument, names);
      } else if (property.type === 'Property') {
        collectPatternNames(property.value, names);
      }
    }
  }
}

/**
 * Bindings in `node` and nested blocks, but not inside nested functions.
 * A nested function's own name is a binding of this scope.
 *
 * @param {any} node
 * @param {Set<string>} names
 */
function collectDirectBindings(node, names) {
  if (!node || typeof node.type !== 'string') {
    return;
  }
  if (FUNCTION_TYPES.has(node.type)) {
    if (node.id && node.id.type === 'Identifier') {
      names.add(node.id.name);
    }
    return;
  }
  if (node.type === 'ClassDeclaration' || node.type === 'ClassExpression') {
    if (node.id && node.id.type === 'Identifier') {
      names.add(node.id.name);
    }
    return;
  }
  if (node.type === 'VariableDeclarator') {
    collectPatternNames(node.id, names);
  }
  for (const child of childNodes(node)) {
    collectDirectBindings(child, names);
  }
}

/**
 * Names declared directly in `scope`, ignoring nested functions.
 *
 * @param {any} scope
 * @returns {Set<string>}
 */
function bindingNames(scope) {
  const cached = bindingNameCache.get(scope);
  if (cached) {
    return cached;
  }

  /** @type {Set<string>} */
  const names = new Set();
  for (const param of scope.params || []) {
    collectPatternNames(param, names);
  }

  const body = scope.type === 'Program' ? scope : scope.body;
  if (body) {
    collectDirectBindings(body, names);
  }

  bindingNameCache.set(scope, names);
  return names;
}

/**
 * Function or program that declares `identifier`, when one does.
 *
 * @param {any} identifier
 * @returns {any | null}
 */
function resolveBindingScope(identifier) {
  /** @type {Set<any>} */
  const seen = new Set();
  let scope = enclosingScope(identifier);
  while (scope && !seen.has(scope)) {
    seen.add(scope);
    if (bindingNames(scope).has(identifier.name)) {
      return scope;
    }
    const parent = enclosingScope(scope);
    if (parent === scope) {
      break;
    }
    scope = parent;
  }
  return null;
}

/**
 * @param {any} identifier
 * @returns {string}
 */
function identifierKey(identifier) {
  const scope = resolveBindingScope(identifier);
  return scope ? `binding:${scopeId(scope)}:${identifier.name}` : `unresolved:${identifier.name}`;
}

/**
 * @param {any} node
 * @returns {string | undefined}
 */
function memberKey(node) {
  if (!node || node.type !== 'MemberExpression' || node.computed || !node.property) {
    return;
  }
  const property = node.property.type === 'Identifier' ? node.property.name : undefined;
  if (!property) {
    return;
  }
  if (node.object.type === 'ThisExpression') {
    return `this.${property}`;
  }
  if (node.object.type === 'Identifier') {
    return `${node.object.name}.${property}`;
  }
  const objectKey = memberKey(node.object);
  if (objectKey) {
    return `${objectKey}.${property}`;
  }
}

/**
 * @param {any} node
 */
function isTimerMethod(node) {
  return (
    node &&
    node.type === 'MemberExpression' &&
    !node.computed &&
    node.property &&
    (node.property.name === 'unref' || node.property.name === 'ref')
  );
}

/**
 * @param {any[]} ancestors Nearest parent last, excluding the setTimeout call.
 * @returns {{ identifier?: any, memberKey?: string } | null}
 */
function assignedTimerTarget(ancestors) {
  let index = ancestors.length - 1;
  while (index >= 0) {
    const parent = ancestors[index];
    if (UNWRAP_TYPES.has(parent.type)) {
      index -= 1;
      continue;
    }
    if (isTimerMethod(parent)) {
      index -= 1;
      continue;
    }
    if (parent.type === 'CallExpression' && parent.callee && isTimerMethod(parent.callee)) {
      index -= 1;
      continue;
    }
    break;
  }

  const parent = ancestors[index];
  if (!parent) {
    return null;
  }
  if (parent.type === 'AssignmentExpression' && parent.operator === '=') {
    if (parent.left.type === 'Identifier') {
      return { identifier: parent.left };
    }
    const key = memberKey(unwrap(parent.left));
    if (key) {
      return { memberKey: key };
    }
  }
  if (parent.type === 'VariableDeclarator' && parent.id.type === 'Identifier') {
    return { identifier: parent.id };
  }
  return null;
}

/**
 * Promise constructors stored on the scope that declares the binding.
 *
 * @param {any} scope
 * @returns {Map<any, Map<string, Array<{ init: any, at: number }>>>}
 */
function promiseInitsByScope(scope) {
  /** @type {Map<any, Map<string, Array<{ init: any, at: number }>>>} */
  const byScope = new Map();

  /**
   * @param {any} identifier
   * @param {any} init
   */
  function add(identifier, init) {
    const bindingScope = resolveBindingScope(identifier);
    if (!bindingScope) {
      return;
    }
    let inits = byScope.get(bindingScope);
    if (!inits) {
      inits = new Map();
      byScope.set(bindingScope, inits);
    }
    let versions = inits.get(identifier.name);
    if (!versions) {
      versions = [];
      inits.set(identifier.name, versions);
    }
    versions.push({ init, at: nodeStart(identifier) });
  }

  walk(
    scope,
    (node) => {
      if (
        node.type === 'VariableDeclarator' &&
        node.id.type === 'Identifier' &&
        node.init &&
        isNewPromise(unwrap(node.init))
      ) {
        add(node.id, unwrap(node.init));
      }
      if (
        node.type === 'AssignmentExpression' &&
        node.operator === '=' &&
        node.left.type === 'Identifier' &&
        isNewPromise(unwrap(node.right))
      ) {
        add(node.left, unwrap(node.right));
      }
    },
    true
  );
  return byScope;
}

/**
 * @param {any} node
 * @returns {number}
 */
function nodeStart(node) {
  if (node && node.range) {
    return node.range[0];
  }
  const start = node && node.loc && node.loc.start;
  if (start) {
    return start.line * 100000 + start.column;
  }
  return 0;
}

/**
 * The promise constructor this identifier refers to at this point in the function.
 * A later assignment to the same binding is not visible yet.
 *
 * @param {any} identifier
 * @param {Map<any, Map<string, Array<{ init: any, at: number }>>>} initsByScope
 * @returns {any}
 */
function lookupPromise(identifier, initsByScope) {
  const useAt = nodeStart(identifier);
  /** @type {Set<any>} */
  const seen = new Set();
  let scope = enclosingScope(identifier);
  while (scope && !seen.has(scope)) {
    seen.add(scope);
    const versions = initsByScope.get(scope) && initsByScope.get(scope).get(identifier.name);
    if (versions) {
      /** @type {{ init: any, at: number } | undefined} */
      let chosen;
      for (const version of versions) {
        if (version.at <= useAt) {
          chosen = version;
        }
      }
      if (chosen) {
        return chosen.init;
      }
    }
    if (bindingNames(scope).has(identifier.name)) {
      return;
    }
    const parent = enclosingScope(scope);
    if (parent === scope) {
      break;
    }
    scope = parent;
  }
}

/**
 * @param {any} scope
 * @returns {{ ids: Array<{ key: string, node: any }>, members: Array<{ key: string, node: any }> }}
 */
function clearedTimerSites(scope) {
  /** @type {Array<{ key: string, node: any }>} */
  const ids = [];
  /** @type {Array<{ key: string, node: any }>} */
  const members = [];
  walk(
    scope,
    (node) => {
      if (node.type !== 'CallExpression' || calleeName(node.callee) !== 'clearTimeout') {
        return;
      }
      const argument = unwrap(node.arguments && node.arguments[0]);
      if (!argument) {
        return;
      }
      if (argument.type === 'Identifier') {
        ids.push({ key: identifierKey(argument), node });
      }
      const key = memberKey(argument);
      if (key) {
        members.push({ key, node });
      }
    },
    true
  );
  return { ids, members };
}

/**
 * @param {any} ancestor
 * @param {any} node
 * @returns {boolean}
 */
function containsNode(ancestor, node) {
  let current = node;
  while (current) {
    if (current === ancestor) {
      return true;
    }
    current = current.parent;
  }
  return false;
}

/**
 * A clearTimeout inside the deadline callback runs only after the timer fires,
 * so it does not drop the closure when the other arm wins.
 *
 * @param {{ node: any, target: { identifier?: any, memberKey?: string } | null }} timer
 * @param {{ ids: Array<{ key: string, node: any }>, members: Array<{ key: string, node: any }> }} cleared
 * @returns {boolean}
 */
function isTimerCleared(timer, cleared) {
  const target = timer.target;
  if (!target) {
    return false;
  }
  const callback = unwrap(timer.node.arguments && timer.node.arguments[0]);
  /** @type {Array<{ key: string, node: any }>} */
  const sites = target.memberKey
    ? cleared.members.filter((site) => site.key === target.memberKey)
    : target.identifier
      ? cleared.ids.filter((site) => site.key === identifierKey(target.identifier))
      : [];
  return sites.some((site) => !callback || !containsNode(callback, site.node));
}

/**
 * @param {any} executor
 * @returns {Set<string>}
 */
function settlerKeys(executor) {
  /** @type {Set<string>} */
  const keys = new Set();
  const params = executor.params || [];
  for (let index = 0; index < Math.min(2, params.length); index++) {
    const param = params[index];
    if (param && param.type === 'Identifier') {
      keys.add(identifierKey(param));
    }
  }
  return keys;
}

/**
 * True when the timer callback calls the executor's resolve or reject.
 *
 * @param {any} call
 * @param {Set<string>} settlers
 * @returns {boolean}
 */
function callbackSettles(call, settlers) {
  if (settlers.size === 0) {
    return false;
  }
  const callback = unwrap(call.arguments && call.arguments[0]);
  if (!callback) {
    return false;
  }
  if (callback.type === 'Identifier') {
    return settlers.has(identifierKey(callback));
  }
  if (!FUNCTION_TYPES.has(callback.type)) {
    return false;
  }

  let settles = false;
  const body = callback.body || callback;
  walk(
    body,
    (node) => {
      if (
        node.type === 'CallExpression' &&
        node.callee &&
        node.callee.type === 'Identifier' &&
        settlers.has(identifierKey(node.callee))
      ) {
        settles = true;
      }
    },
    true
  );
  return settles;
}

/**
 * @param {any} executor
 * @returns {any[]}
 */
function deadlineTimers(executor) {
  /** @type {any[]} */
  const timers = [];
  const ancestors = [];
  const settlers = settlerKeys(executor);

  /**
   * @param {any} node
   */
  function visit(node) {
    ancestors.push(node);
    if (isSetTimeoutCall(node) && callbackSettles(node, settlers)) {
      timers.push({ node, target: assignedTimerTarget(ancestors.slice(0, -1)) });
    }
    for (const child of childNodes(node)) {
      if (FUNCTION_TYPES.has(child.type)) {
        continue;
      }
      visit(child);
    }
    ancestors.pop();
  }

  for (const child of childNodes(executor)) {
    if (FUNCTION_TYPES.has(child.type)) {
      continue;
    }
    visit(child);
  }
  return timers;
}

/**
 * @param {any} race
 * @param {Map<any, Map<string, Array<{ init: any, at: number }>>>} initsByScope
 * @returns {any[]}
 */
function raceExecutors(race, initsByScope) {
  const list = race.arguments && race.arguments[0];
  if (!list || list.type !== 'ArrayExpression') {
    return [];
  }

  /** @type {any[]} */
  const executors = [];
  for (const element of list.elements) {
    if (!element || element.type === 'SpreadElement') {
      continue;
    }
    let arm = unwrap(element);
    if (arm && arm.type === 'Identifier') {
      arm = lookupPromise(arm, initsByScope);
    }
    if (isNewPromise(arm)) {
      executors.push(arm.arguments[0]);
    }
  }
  return executors;
}

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Require Promise.race deadline timers to be cleared, or replaced with @kbn/std withTimeout.',
    },
    schema: [],
    messages: {
      uncleared: MESSAGE,
    },
  },
  createOnce(context) {
    return {
      Program(program) {
        linkParents(program);
        walk(
          program,
          (node) => {
            if (!isPromiseRace(node)) {
              return;
            }
            const scope = enclosingScope(node);
            const inits = promiseInitsByScope(scope);
            const cleared = clearedTimerSites(scope);
            for (const executor of raceExecutors(node, inits)) {
              for (const timer of deadlineTimers(executor)) {
                if (isTimerCleared(timer, cleared)) {
                  continue;
                }
                context.report({ node: timer.node, messageId: 'uncleared' });
              }
            }
          },
          true
        );
      },
    };
  },
};
