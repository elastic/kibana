/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License, v 1"; you may not use this file except in compliance with, at
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
 * @returns {string | undefined}
 */
function assignedTimerName(ancestors) {
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
    return;
  }
  if (
    parent.type === 'AssignmentExpression' &&
    parent.operator === '=' &&
    parent.left.type === 'Identifier'
  ) {
    return parent.left.name;
  }
  if (parent.type === 'VariableDeclarator' && parent.id.type === 'Identifier') {
    return parent.id.name;
  }
}

/**
 * @param {any} scope
 * @returns {Map<string, any>}
 */
function promiseBindings(scope) {
  /** @type {Map<string, any>} */
  const bindings = new Map();
  walk(
    scope,
    (node) => {
      if (
        node.type === 'VariableDeclarator' &&
        node.id.type === 'Identifier' &&
        node.init &&
        isNewPromise(unwrap(node.init))
      ) {
        bindings.set(node.id.name, unwrap(node.init));
      }
      if (
        node.type === 'AssignmentExpression' &&
        node.operator === '=' &&
        node.left.type === 'Identifier' &&
        isNewPromise(unwrap(node.right))
      ) {
        bindings.set(node.left.name, unwrap(node.right));
      }
    },
    true
  );
  return bindings;
}

/**
 * @param {any} scope
 * @returns {Set<string>}
 */
function clearedTimerNames(scope) {
  /** @type {Set<string>} */
  const names = new Set();
  walk(
    scope,
    (node) => {
      if (node.type !== 'CallExpression' || calleeName(node.callee) !== 'clearTimeout') {
        return;
      }
      const argument = unwrap(node.arguments && node.arguments[0]);
      if (argument && argument.type === 'Identifier') {
        names.add(argument.name);
      }
    },
    true
  );
  return names;
}

/**
 * @param {any} executor
 * @returns {any[]}
 */
function deadlineTimers(executor) {
  /** @type {any[]} */
  const timers = [];
  const ancestors = [];

  /**
   * @param {any} node
   */
  function visit(node) {
    ancestors.push(node);
    if (isSetTimeoutCall(node)) {
      timers.push({ node, name: assignedTimerName(ancestors.slice(0, -1)) });
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
 * @param {Map<string, any>} bindings
 * @returns {any[]}
 */
function raceExecutors(race, bindings) {
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
      arm = bindings.get(arm.name);
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
            const bindings = promiseBindings(scope);
            const cleared = clearedTimerNames(scope);
            for (const executor of raceExecutors(node, bindings)) {
              for (const timer of deadlineTimers(executor)) {
                if (timer.name && cleared.has(timer.name)) {
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
