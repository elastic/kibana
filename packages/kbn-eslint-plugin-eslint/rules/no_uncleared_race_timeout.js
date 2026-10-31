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
 *
 * This is a direct check. It looks at a `new Promise` written in the race, or
 * an identifier assigned one earlier in the same function. It does not follow
 * helpers, later reassignment, or which branch actually reaches the race.
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

const LEXICAL_SCOPE_TYPES = new Set([
  'Program',
  'BlockStatement',
  'StaticBlock',
  'ForStatement',
  'ForInStatement',
  'ForOfStatement',
  'SwitchStatement',
  'CatchClause',
  ...FUNCTION_TYPES,
]);

/**
 * Nearest block, loop, catch, function, or program that contains `node`.
 *
 * @param {any} node
 * @returns {any | null}
 */
function parentLexicalScope(node) {
  let current = node.parent;
  while (current) {
    if (LEXICAL_SCOPE_TYPES.has(current.type)) {
      return current;
    }
    current = current.parent;
  }
  return null;
}

/**
 * @param {any} statement
 * @param {Set<string>} names
 */
function collectStatementBindings(statement, names) {
  if (!statement) {
    return;
  }
  if (statement.type === 'VariableDeclaration' && statement.kind !== 'var') {
    for (const declarator of statement.declarations) {
      collectPatternNames(declarator.id, names);
    }
    return;
  }
  if (
    (statement.type === 'FunctionDeclaration' || statement.type === 'ClassDeclaration') &&
    statement.id &&
    statement.id.type === 'Identifier'
  ) {
    names.add(statement.id.name);
    return;
  }
  if (
    statement.type === 'ExportNamedDeclaration' ||
    statement.type === 'ExportDefaultDeclaration'
  ) {
    collectStatementBindings(statement.declaration, names);
  }
}

/**
 * `var` bindings of this function. Nested functions keep their own.
 *
 * @param {any} node
 * @param {Set<string>} names
 */
function collectVarBindings(node, names) {
  if (!node || typeof node.type !== 'string' || FUNCTION_TYPES.has(node.type)) {
    return;
  }
  if (node.type === 'VariableDeclaration' && node.kind === 'var') {
    for (const declarator of node.declarations) {
      collectPatternNames(declarator.id, names);
    }
  }
  for (const child of childNodes(node)) {
    if (FUNCTION_TYPES.has(child.type)) {
      continue;
    }
    collectVarBindings(child, names);
  }
}

/**
 * @param {any} scope
 * @returns {any[]}
 */
function blockStatements(scope) {
  if (scope.type === 'SwitchStatement') {
    /** @type {any[]} */
    const statements = [];
    for (const switchCase of scope.cases || []) {
      statements.push(...(switchCase.consequent || []));
    }
    return statements;
  }
  if (scope.type === 'BlockStatement' || scope.type === 'Program' || scope.type === 'StaticBlock') {
    return scope.body || [];
  }
  return [];
}

/**
 * Names declared by this scope. A `const` inside a nested block stays there.
 *
 * @param {any} scope
 * @returns {Set<string>}
 */
function bindingsOf(scope) {
  const cached = bindingNameCache.get(scope);
  if (cached) {
    return cached;
  }

  /** @type {Set<string>} */
  const names = new Set();
  if (FUNCTION_TYPES.has(scope.type)) {
    for (const param of scope.params || []) {
      collectPatternNames(param, names);
    }
    if (scope.type !== 'FunctionDeclaration' && scope.id && scope.id.type === 'Identifier') {
      names.add(scope.id.name);
    }
    if (scope.body) {
      collectVarBindings(scope.body, names);
    }
  }
  if (scope.type === 'CatchClause' && scope.param) {
    collectPatternNames(scope.param, names);
  }
  const loopDeclaration = scope.left || scope.init;
  if (
    loopDeclaration &&
    loopDeclaration.type === 'VariableDeclaration' &&
    loopDeclaration.kind !== 'var'
  ) {
    for (const declarator of loopDeclaration.declarations) {
      collectPatternNames(declarator.id, names);
    }
  }
  for (const statement of blockStatements(scope)) {
    collectStatementBindings(statement, names);
  }

  bindingNameCache.set(scope, names);
  return names;
}

/**
 * Block or function that declares `identifier`, when one does.
 *
 * @param {any} identifier
 * @returns {any | null}
 */
function resolveBindingScope(identifier) {
  /** @type {Set<any>} */
  const seen = new Set();
  let scope = parentLexicalScope(identifier);
  while (scope && !seen.has(scope)) {
    seen.add(scope);
    if (bindingsOf(scope).has(identifier.name)) {
      return scope;
    }
    const parent = parentLexicalScope(scope);
    if (!parent || parent === scope) {
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
    return `this:${scopeId(thisOwner(node))}.${property}`;
  }
  if (node.object.type === 'Identifier') {
    return `${identifierKey(node.object)}.${property}`;
  }
  const objectKey = memberKey(node.object);
  if (objectKey) {
    return `${objectKey}.${property}`;
  }
}

/**
 * @param {any} node
 */
/**
 * Arrow functions use the `this` of the nearest function that has its own.
 *
 * @param {any} node
 * @returns {any}
 */
function thisOwner(node) {
  /** @type {Set<any>} */
  const seen = new Set();
  let scope = enclosingScope(node);
  while (scope && !seen.has(scope)) {
    seen.add(scope);
    if (scope.type !== 'ArrowFunctionExpression') {
      return scope;
    }
    const parent = enclosingScope(scope);
    if (!parent || parent === scope) {
      return scope;
    }
    scope = parent;
  }
  return scope;
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
 * @returns {Map<any, Map<string, Array<{ value: any, at: number }>>>}
 */
function promiseInitsByScope(scope) {
  /** @type {Map<any, Map<string, Array<{ value: any, at: number }>>>} */
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
    versions.push({ value: init, at: nodeStart(identifier) });
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
 * The value this identifier refers to at this point in the function.
 * A later assignment to the same binding is not visible yet.
 *
 * @param {any} identifier
 * @param {Map<any, Map<string, Array<{ value: any, at: number }>>>} valuesByScope
 * @returns {any}
 */
function lookupValue(identifier, valuesByScope) {
  const useAt = nodeStart(identifier);
  /** @type {Set<any>} */
  const seen = new Set();
  let scope = parentLexicalScope(identifier);
  while (scope && !seen.has(scope)) {
    seen.add(scope);
    const versions = valuesByScope.get(scope) && valuesByScope.get(scope).get(identifier.name);
    if (versions) {
      /** @type {{ value: any, at: number } | undefined} */
      let chosen;
      for (const version of versions) {
        if (version.at <= useAt) {
          chosen = version;
        }
      }
      if (chosen) {
        return chosen.value;
      }
    }
    if (bindingsOf(scope).has(identifier.name)) {
      return;
    }
    const parent = parentLexicalScope(scope);
    if (!parent || parent === scope) {
      break;
    }
    scope = parent;
  }
}

/**
 * @param {any} identifier
 * @param {Map<any, Map<string, Array<{ value: any, at: number }>>>} initsByScope
 * @returns {any}
 */
function lookupPromise(identifier, initsByScope) {
  return lookupValue(identifier, initsByScope);
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
  let sites = [];
  if (target.memberKey) {
    sites = cleared.members.filter((site) => site.key === target.memberKey);
  } else if (target.identifier) {
    sites = cleared.ids.filter((site) => site.key === identifierKey(target.identifier));
  }
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
 * Local functions a callback identifier may refer to.
 * Function declarations are hoisted within their block.
 *
 * @param {any} scope
 * @returns {Map<any, Map<string, Array<{ value: any, at: number }>>>}
 */
function functionValuesByScope(scope) {
  /** @type {Map<any, Map<string, Array<{ value: any, at: number }>>>} */
  const byScope = new Map();

  /**
   * @param {any} identifier
   * @param {any} fn
   * @param {number} at
   */
  function add(identifier, fn, at) {
    const bindingScope = resolveBindingScope(identifier);
    if (!bindingScope) {
      return;
    }
    let values = byScope.get(bindingScope);
    if (!values) {
      values = new Map();
      byScope.set(bindingScope, values);
    }
    let versions = values.get(identifier.name);
    if (!versions) {
      versions = [];
      values.set(identifier.name, versions);
    }
    versions.push({ value: fn, at });
  }

  walk(
    scope,
    (node) => {
      if (node.type === 'FunctionDeclaration' && node.id && node.id.type === 'Identifier') {
        add(node.id, node, -1);
      }
      if (node.type === 'VariableDeclarator' && node.id.type === 'Identifier' && node.init) {
        const init = unwrap(node.init);
        if (init && FUNCTION_TYPES.has(init.type)) {
          add(node.id, init, nodeStart(node.id));
        }
      }
      if (
        node.type === 'AssignmentExpression' &&
        node.operator === '=' &&
        node.left.type === 'Identifier'
      ) {
        const right = unwrap(node.right);
        if (right && FUNCTION_TYPES.has(right.type)) {
          add(node.left, right, nodeStart(node.left));
        }
      }
    },
    true
  );
  return byScope;
}

/**
 * True when `node` calls the executor's resolve or reject, following local functions.
 *
 * @param {any} node
 * @param {Set<string>} settlers
 * @param {Map<any, Map<string, Array<{ value: any, at: number }>>>} functions
 * @param {Set<any>} seen
 * @returns {boolean}
 */
function nodeSettles(node, settlers, functions, seen) {
  if (!node || seen.has(node)) {
    return false;
  }
  if (node.type === 'Identifier') {
    if (settlers.has(identifierKey(node))) {
      return true;
    }
    const fn = lookupValue(node, functions);
    if (!fn || seen.has(fn)) {
      return false;
    }
    seen.add(fn);
    return bodySettles(fn, settlers, functions, seen);
  }
  if (FUNCTION_TYPES.has(node.type)) {
    seen.add(node);
    return bodySettles(node, settlers, functions, seen);
  }
  return false;
}

/**
 * @param {any} fn
 * @param {Set<string>} settlers
 * @param {Map<any, Map<string, Array<{ value: any, at: number }>>>} functions
 * @param {Set<any>} seen
 * @returns {boolean}
 */
function bodySettles(fn, settlers, functions, seen) {
  let settles = false;
  walk(
    fn.body || fn,
    (node) => {
      if (
        !settles &&
        node.type === 'CallExpression' &&
        node.callee &&
        node.callee.type === 'Identifier' &&
        nodeSettles(node.callee, settlers, functions, seen)
      ) {
        settles = true;
      }
    },
    true
  );
  return settles;
}

/**
 * True when the timer callback calls the executor's resolve or reject.
 *
 * @param {any} call
 * @param {Set<string>} settlers
 * @param {Map<any, Map<string, Array<{ value: any, at: number }>>>} functions
 * @returns {boolean}
 */
function callbackSettles(call, settlers, functions) {
  if (settlers.size === 0) {
    return false;
  }
  const callback = unwrap(call.arguments && call.arguments[0]);
  return nodeSettles(callback, settlers, functions, new Set());
}

/**
 * @param {any} executor
 * @param {Map<any, Map<string, Array<{ value: any, at: number }>>>} functions
 * @returns {any[]}
 */
function deadlineTimers(executor, functions) {
  /** @type {any[]} */
  const timers = [];
  const ancestors = [];
  const settlers = settlerKeys(executor);

  /**
   * @param {any} node
   */
  function visit(node) {
    ancestors.push(node);
    if (isSetTimeoutCall(node) && callbackSettles(node, settlers, functions)) {
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
 * @param {Map<any, Map<string, Array<{ value: any, at: number }>>>} initsByScope
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
            const functions = functionValuesByScope(scope);
            const cleared = clearedTimerSites(scope);
            for (const executor of raceExecutors(node, inits)) {
              for (const timer of deadlineTimers(executor, functions)) {
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
