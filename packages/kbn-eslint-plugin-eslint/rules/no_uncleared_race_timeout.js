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
  if (scope.type === 'Program') {
    collectVarBindings(scope, names);
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
    const home = scopeFunction(bindingScope);
    const writeFn = enclosingScope(identifier);
    const ordered = writeFn === home;
    versions.push({
      value: init,
      at: nodeStart(identifier),
      ordered,
      fn: ordered ? null : writeFn,
      anchor: identifier,
    });
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
 * @param {any} node
 * @returns {number}
 */
function nodeEnd(node) {
  if (node && node.range) {
    return node.range[1];
  }
  const end = node && node.loc && node.loc.end;
  if (end) {
    return end.line * 100000 + end.column;
  }
  return nodeStart(node);
}

/**
 * @param {any} node
 * @param {number} at
 * @returns {boolean}
 */
function rangeContains(node, at) {
  return Boolean(node) && nodeStart(node) <= at && at < nodeEnd(node);
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
        if (version.at <= useAt && (!chosen || version.at >= chosen.at)) {
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
 * Function or program that owns bindings in `scope`.
 *
 * @param {any} scope
 * @returns {any}
 */
function scopeFunction(scope) {
  if (!scope || FUNCTION_TYPES.has(scope.type) || scope.type === 'Program') {
    return scope;
  }
  const parent = enclosingScope(scope);
  return parent && parent !== scope ? parent : scope;
}

/**
 * True when `node` might not run because a conditional or loop sits between it
 * and `stop`. The test of an `if` still runs.
 *
 * @param {any} node
 * @param {any} stop
 * @returns {boolean}
 */
function isConditional(node, stop) {
  let child = node;
  let current = node && node.parent;
  while (current && current !== stop) {
    if (current.type === 'IfStatement' && child !== current.test) {
      return true;
    }
    if (current.type === 'ConditionalExpression' && child !== current.test) {
      return true;
    }
    if (current.type === 'LogicalExpression' && child === current.right) {
      return true;
    }
    if (
      (current.type === 'WhileStatement' ||
        current.type === 'DoWhileStatement' ||
        current.type === 'ForStatement') &&
      child !== current.test &&
      child !== current.init
    ) {
      return true;
    }
    if (
      (current.type === 'ForInStatement' || current.type === 'ForOfStatement') &&
      child !== current.right &&
      child !== current.left
    ) {
      return true;
    }
    if (current.type === 'SwitchStatement' && child !== current.discriminant) {
      return true;
    }
    if (current.type === 'CatchClause') {
      return true;
    }
    if (FUNCTION_TYPES.has(current.type)) {
      break;
    }
    child = current;
    current = current.parent;
  }
  return false;
}

/**
 * Source offset of the first await or yield in `fn`, ignoring nested functions.
 *
 * @param {any} fn
 * @returns {number}
 */
function firstSuspensionAt(fn) {
  let at = Infinity;
  const root = fn && (fn.body || fn);
  if (!root || FUNCTION_TYPES.has(root.type)) {
    return at;
  }

  /**
   * @param {any} node
   */
  function visit(node) {
    if (node.type === 'AwaitExpression' || node.type === 'YieldExpression') {
      at = Math.min(at, nodeStart(node));
    }
    for (const child of childNodes(node)) {
      if (FUNCTION_TYPES.has(child.type)) {
        continue;
      }
      visit(child);
    }
  }

  visit(root);
  return at;
}

/**
 * Direct calls in `fn` before `beforeAt`. Nested functions are separate.
 *
 * @param {any} fn
 * @param {number} beforeAt
 * @param {Map<any, Map<string, Array<{ value: any, at: number }>>>} functions
 * @returns {Array<{ at: number, node: any, fn: any, conditional: boolean, awaited: boolean }>}
 */
function callsIn(fn, beforeAt, functions) {
  /** @type {Array<{ at: number, node: any, fn: any, conditional: boolean, awaited: boolean }>} */
  const calls = [];
  const root = fn && fn.type === 'Program' ? fn : fn && fn.body;
  if (!root || FUNCTION_TYPES.has(root.type)) {
    return calls;
  }

  /**
   * @param {any} node
   */
  function visit(node) {
    if (
      node.type === 'CallExpression' &&
      node.callee &&
      node.callee.type === 'Identifier' &&
      nodeStart(node) < beforeAt
    ) {
      const target = lookupValue(node.callee, functions);
      if (target && FUNCTION_TYPES.has(target.type)) {
        calls.push({
          at: nodeStart(node),
          node,
          fn: target,
          conditional: isConditional(node, fn),
          awaited: isAwaitedCall(node),
        });
      }
    }
    for (const child of childNodes(node)) {
      if (FUNCTION_TYPES.has(child.type)) {
        continue;
      }
      visit(child);
    }
  }

  visit(root);
  return calls;
}

/**
 * `await arm()` has finished arm's later assignments. `arm()` has not.
 *
 * @param {any} node
 * @returns {boolean}
 */
function isAwaitedCall(node) {
  let current = node && node.parent;
  while (current && UNWRAP_TYPES.has(current.type)) {
    if (current.type === 'AwaitExpression') {
      return true;
    }
    current = current.parent;
  }
  return false;
}

/**
 * Promises a run of `fn` may assign. A fire-and-forget call only sees writes
 * before the first await. An awaited call sees writes after that await too.
 * Conditional writes and calls keep the previous value.
 *
 * @param {any} fn
 * @param {Array<{ value: any, at: number, ordered: boolean, fn: any, anchor: any }>} versions
 * @param {Map<any, Map<string, Array<{ value: any, at: number }>>>} functions
 * @param {Set<any>} seen
 * @param {boolean} includeDeferred
 * @returns {{ values: any[], definite: boolean }}
 */
function syncInstalls(fn, versions, functions, seen, includeDeferred) {
  if (!fn || seen.has(fn)) {
    return { values: [], definite: false };
  }
  seen.add(fn);

  const suspendAt = includeDeferred ? Infinity : firstSuspensionAt(fn);
  /** @type {Array<{ at: number, kind: 'write' | 'call', value?: any, fn?: any, conditional: boolean }>} */
  const events = [];
  for (const version of versions) {
    if (!version.ordered && version.fn === fn && version.at < suspendAt) {
      events.push({
        at: version.at,
        kind: 'write',
        value: version.value,
        conditional: isConditional(version.anchor, fn),
      });
    }
  }
  for (const call of callsIn(fn, suspendAt, functions)) {
    events.push({
      at: call.at,
      kind: 'call',
      fn: call.fn,
      conditional: call.conditional,
      awaited: call.awaited,
    });
  }
  events.sort((left, right) => left.at - right.at);

  /** @type {any[]} */
  let possible = [];
  let definite = false;
  for (const event of events) {
    if (event.kind === 'write') {
      if (event.conditional) {
        possible = possible.concat(event.value);
      } else {
        possible = [event.value];
        definite = true;
      }
      continue;
    }
    const inner = syncInstalls(event.fn, versions, functions, seen, Boolean(event.awaited));
    if (!inner.values.length) {
      continue;
    }
    if (event.conditional || !inner.definite) {
      possible = possible.concat(inner.values);
    } else {
      possible = inner.values.slice();
      definite = true;
    }
  }
  return { values: possible, definite };
}

/**
 * If statements in `home` that have an else and start at or before `useAt`.
 *
 * @param {any} home
 * @param {number} useAt
 * @returns {any[]}
 */
function ifStatementsBefore(home, useAt) {
  /** @type {any[]} */
  const found = [];
  const root = home && home.type === 'Program' ? home : home && home.body;
  if (!root || FUNCTION_TYPES.has(root.type)) {
    return found;
  }

  /**
   * @param {any} node
   */
  function visit(node) {
    if (node.type === 'IfStatement' && node.alternate && nodeStart(node) <= useAt) {
      found.push(node);
    }
    for (const child of childNodes(node)) {
      if (FUNCTION_TYPES.has(child.type)) {
        continue;
      }
      visit(child);
    }
  }

  visit(root);
  return found;
}

/**
 * @param {any[]} left
 * @param {any[]} right
 * @returns {any[]}
 */
function unionValues(left, right) {
  /** @type {any[]} */
  const values = [];
  const seen = new Set();
  for (const value of left.concat(right)) {
    if (!seen.has(value)) {
      seen.add(value);
      values.push(value);
    }
  }
  return values;
}

/**
 * True when `node` sits inside a function nested under `stop`.
 *
 * @param {any} node
 * @param {any} stop
 * @returns {boolean}
 */
function isInNestedFunction(node, stop) {
  let current = node && node.parent;
  while (current && current !== stop) {
    if (FUNCTION_TYPES.has(current.type)) {
      return true;
    }
    current = current.parent;
  }
  return false;
}

/**
 * Writes of this binding inside `branch` that run as part of `branch`.
 *
 * @param {any} branch
 * @param {Array<{ value: any, at: number, ordered?: boolean, anchor: any }>} versions
 * @param {number} useAt
 * @returns {Array<{ value: any, at: number, anchor: any }>}
 */
function writesReaching(branch, versions, useAt) {
  return versions.filter(
    (version) =>
      version.anchor &&
      version.ordered !== false &&
      version.at <= useAt &&
      containsNode(branch, version.anchor) &&
      !isInNestedFunction(version.anchor, branch)
  );
}

/**
 * Values that reach the end of `branch`. `definite` means every path assigns.
 * A later conditional assignment stays possible; an earlier one does not.
 *
 * @param {any} branch
 * @param {Array<{ value: any, at: number, ordered?: boolean, anchor: any }>} versions
 * @param {number} useAt
 * @returns {{ definite: boolean, values: any[] }}
 */
function branchFlow(branch, versions, useAt) {
  if (!branch) {
    return { definite: false, values: [] };
  }
  if (branch.type === 'BlockStatement') {
    /** @type {any[]} */
    let possible = [];
    let definite = false;
    for (const statement of branch.body) {
      const step = branchFlow(statement, versions, useAt);
      if (step.definite) {
        possible = step.values.slice();
        definite = true;
      } else if (step.values.length) {
        possible = unionValues(possible, step.values);
      }
    }
    return { definite, values: possible };
  }
  if (branch.type === 'IfStatement' && branch.alternate) {
    const thenResult = branchFlow(branch.consequent, versions, useAt);
    const elseResult = branchFlow(branch.alternate, versions, useAt);
    const values = unionValues(thenResult.values, elseResult.values);
    return { definite: thenResult.definite && elseResult.definite, values };
  }
  if (branch.type === 'IfStatement') {
    return { definite: false, values: branchFlow(branch.consequent, versions, useAt).values };
  }
  if (branch.type === 'TryStatement') {
    return tryFlow(branch, versions, useAt);
  }
  if (branch.type === 'DoWhileStatement') {
    return branchFlow(branch.body, versions, useAt);
  }
  if (
    branch.type === 'ForStatement' ||
    branch.type === 'ForInStatement' ||
    branch.type === 'ForOfStatement' ||
    branch.type === 'WhileStatement' ||
    branch.type === 'SwitchStatement'
  ) {
    return {
      definite: false,
      values: writesReaching(branch, versions, useAt).map((version) => version.value),
    };
  }

  const writes = writesReaching(branch, versions, useAt).filter(
    (version) => !isConditional(version.anchor, branch)
  );
  if (!writes.length) {
    return { definite: false, values: [] };
  }
  writes.sort((left, right) => left.at - right.at);
  return { definite: true, values: [writes[writes.length - 1].value] };
}

/**
 * A `finally` that always assigns replaces the try and catch values.
 * Without that, the try is definite only when both the try and the catch assign.
 *
 * @param {any} statement
 * @param {Array<{ value: any, at: number, ordered?: boolean, anchor: any }>} versions
 * @param {number} useAt
 * @returns {{ definite: boolean, values: any[] }}
 */
function tryFlow(statement, versions, useAt) {
  const finalizer = statement.finalizer ? branchFlow(statement.finalizer, versions, useAt) : null;
  if (finalizer && finalizer.definite) {
    return { definite: true, values: finalizer.values };
  }
  const tried = branchFlow(statement.block, versions, useAt);
  const caught = statement.handler
    ? branchFlow(statement.handler.body, versions, useAt)
    : null;
  let values = unionValues(tried.values, caught ? caught.values : []);
  if (finalizer) {
    values = unionValues(values, finalizer.values);
  }
  return { definite: Boolean(caught && tried.definite && caught.definite), values };
}

/**
 * @param {any} statement
 * @param {Array<{ value: any, at: number, ordered?: boolean, anchor: any }>} versions
 * @param {number} useAt
 * @param {Set<any>} covered
 */
function coverBranchWrites(statement, versions, useAt, covered) {
  if (!statement) {
    return;
  }
  for (const version of versions) {
    if (
      version.anchor &&
      version.ordered !== false &&
      version.at <= useAt &&
      containsNode(statement, version.anchor) &&
      !isInNestedFunction(version.anchor, statement)
    ) {
      covered.add(version);
    }
  }
}

/**
 * Local assignments that can reach `useAt`. An if/else that assigns on every
 * path replaces whatever came before it, including nested conditional writes
 * that can still reach the end of a branch.
 *
 * @param {Array<{ value: any, at: number, ordered?: boolean, anchor: any }>} versions
 * @param {any} home
 * @param {number} useAt
 * @returns {Array<{ at: number, values: any[], replace: boolean }>}
 */
function localAssignmentEvents(versions, home, useAt) {
  /** @type {Array<{ at: number, values: any[], replace: boolean }>} */
  const events = [];
  const covered = new Set();
  for (const statement of ifStatementsBefore(home, useAt)) {
    if (!home || isConditional(statement, home)) {
      continue;
    }
    if (rangeContains(statement, useAt)) {
      const inThen = rangeContains(statement.consequent, useAt);
      const inElse = Boolean(statement.alternate && rangeContains(statement.alternate, useAt));
      if (!inThen && !inElse) {
        continue;
      }
      const taken = inThen ? statement.consequent : statement.alternate;
      const other = inThen ? statement.alternate : statement.consequent;
      coverBranchWrites(other, versions, useAt, covered);
      const takenResult = branchFlow(taken, versions, useAt);
      if (takenResult.definite) {
        events.push({
          at: nodeStart(statement),
          values: takenResult.values,
          replace: true,
        });
        coverBranchWrites(taken, versions, useAt, covered);
      }
      continue;
    }
    const thenResult = branchFlow(statement.consequent, versions, useAt);
    const elseResult = branchFlow(statement.alternate, versions, useAt);
    if (!thenResult.definite || !elseResult.definite) {
      continue;
    }
    events.push({
      at: nodeStart(statement),
      values: unionValues(thenResult.values, elseResult.values),
      replace: true,
    });
    coverBranchWrites(statement, versions, useAt, covered);
  }
  for (const version of versions) {
    if (covered.has(version) || version.ordered === false || version.at > useAt) {
      continue;
    }
    const conditional = Boolean(version.anchor && home && isConditional(version.anchor, home));
    events.push({
      at: version.at,
      values: [version.value],
      replace: !conditional,
    });
  }
  return events;
}

/**
 * @param {Array<{ at: number, values: any[], replace: boolean }>} events
 * @returns {any[]}
 */
function reduceEvents(events) {
  const ordered = events.slice().sort((left, right) => left.at - right.at);
  /** @type {any[]} */
  let possible = [];
  for (const event of ordered) {
    possible = event.replace ? event.values.slice() : unionValues(possible, event.values);
  }
  return possible;
}

/**
 * Promises this binding may hold at `useAt`.
 *
 * @param {Array<{ value: any, at: number, ordered: boolean, fn: any, anchor: any }>} versions
 * @param {any} bindingScope
 * @param {number} useAt
 * @returns {any[]}
 */
function possiblePromises(versions, bindingScope, useAt) {
  const home = scopeFunction(bindingScope);
  const functions = functionValuesByScope(home);
  const events = localAssignmentEvents(versions, home, useAt);
  for (const call of callsIn(home, useAt + 1, functions)) {
    // Arguments are evaluated before the callee runs, so a race inside this
    // call does not see assignments the call makes.
    if (rangeContains(call.node, useAt)) {
      continue;
    }
    const installed = syncInstalls(call.fn, versions, functions, new Set(), call.awaited);
    if (!installed.values.length) {
      continue;
    }
    events.push({
      at: call.at,
      values: installed.values,
      replace: installed.definite && !call.conditional,
    });
  }
  return reduceEvents(events).filter((value) => value);
}

/**
 * @param {any} identifier
 * @param {Map<any, Map<string, Array<{ value: any, at: number, ordered: boolean, fn: any, anchor: any }>>>} initsByScope
 * @returns {any[]}
 */
function lookupPromises(identifier, initsByScope) {
  const useAt = nodeStart(identifier);
  /** @type {Set<any>} */
  const seen = new Set();
  let scope = parentLexicalScope(identifier);
  while (scope && !seen.has(scope)) {
    seen.add(scope);
    const versions = initsByScope.get(scope) && initsByScope.get(scope).get(identifier.name);
    if (versions) {
      const values = possiblePromises(versions, scope, useAt);
      if (values.length) {
        return values;
      }
    }
    if (bindingsOf(scope).has(identifier.name)) {
      return [];
    }
    const parent = parentLexicalScope(scope);
    if (!parent || parent === scope) {
      break;
    }
    scope = parent;
  }
  return [];
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
    versions.push({ value: fn, at, anchor: identifier });
  }

  walk(
    scope,
    (node) => {
      if (node.type === 'FunctionDeclaration' && node.id && node.id.type === 'Identifier') {
        add(node.id, node, -1);
      }
      if (node.type === 'VariableDeclarator' && node.id.type === 'Identifier' && node.init) {
        const init = unwrap(node.init);
        const fn = init && FUNCTION_TYPES.has(init.type) ? init : null;
        add(node.id, fn, nodeStart(node.id));
      }
      if (
        node.type === 'AssignmentExpression' &&
        node.operator === '=' &&
        node.left.type === 'Identifier'
      ) {
        const right = unwrap(node.right);
        const fn = right && FUNCTION_TYPES.has(right.type) ? right : null;
        add(node.left, fn, nodeStart(node.left));
      }
    },
    true
  );
  return byScope;
}

/**
 * Functions this identifier may still refer to. A conditional overwrite keeps
 * the previous callback. An if/else that assigns on every path replaces it.
 *
 * @param {any} identifier
 * @param {Map<any, Map<string, Array<{ value: any, at: number, anchor: any }>>>} valuesByScope
 * @returns {any[]}
 */
function lookupPossibleFunctions(identifier, valuesByScope) {
  const useAt = nodeStart(identifier);
  /** @type {Set<any>} */
  const seen = new Set();
  let scope = parentLexicalScope(identifier);
  while (scope && !seen.has(scope)) {
    seen.add(scope);
    const versions = valuesByScope.get(scope) && valuesByScope.get(scope).get(identifier.name);
    if (versions) {
      const possible = reduceEvents(localAssignmentEvents(versions, scopeFunction(scope), useAt));
      if (versions.some((version) => version.at <= useAt)) {
        return possible.filter((value) => value && FUNCTION_TYPES.has(value.type));
      }
    }
    if (bindingsOf(scope).has(identifier.name)) {
      return [];
    }
    const parent = parentLexicalScope(scope);
    if (!parent || parent === scope) {
      break;
    }
    scope = parent;
  }
  return [];
}

function nodeSettles(node, settlers, functions, seen) {
  if (!node || seen.has(node)) {
    return false;
  }
  if (node.type === 'Identifier') {
    if (settlers.has(identifierKey(node))) {
      return true;
    }
    for (const fn of lookupPossibleFunctions(node, functions)) {
      if (!fn || seen.has(fn)) {
        continue;
      }
      seen.add(fn);
      if (bodySettles(fn, settlers, functions, seen)) {
        return true;
      }
    }
    return false;
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
    const arm = unwrap(element);
    const promises = arm && arm.type === 'Identifier' ? lookupPromises(arm, initsByScope) : [arm];
    for (const promise of promises) {
      if (isNewPromise(promise) && !executors.includes(promise.arguments[0])) {
        executors.push(promise.arguments[0]);
      }
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
