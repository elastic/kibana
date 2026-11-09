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
 *
 * Identifier bindings come from scope analysis. Property timers such as
 * `this.timer` are matched by their text, because a property is not a variable.
 */

/** @typedef {import("eslint").SourceCode} SourceCode */
/** @typedef {import("@oxlint/plugins").Variable} Variable */

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
 * @returns {boolean}
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
 * @returns {boolean}
 */
function isNewPromise(node) {
  return (
    !!node &&
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
 * @returns {boolean}
 */
function isSetTimeoutCall(node) {
  return node.type === 'CallExpression' && calleeName(node.callee) === 'setTimeout';
}

/**
 * @param {any} ancestor
 * @param {any} node
 * @returns {boolean}
 */
function isInside(ancestor, node) {
  const ancestorRange = ancestor && ancestor.range;
  const nodeRange = node && node.range;
  if (!ancestorRange || !nodeRange) {
    return false;
  }
  return ancestorRange[0] <= nodeRange[0] && nodeRange[1] <= ancestorRange[1];
}

/**
 * @param {SourceCode} sourceCode
 * @param {any} node
 * @returns {Variable | null}
 */
function resolveVariable(sourceCode, node) {
  if (!node || node.type !== 'Identifier') {
    return null;
  }
  let scope = /** @type {any} */ (sourceCode.getScope(node));
  while (scope) {
    const variable = scope.set && scope.set.get(node.name);
    if (variable) {
      return variable;
    }
    scope = scope.upper;
  }
  return null;
}

/**
 * Nearest function that owns `node`, or the program when the race is top-level.
 * An arrow counts: writes and clearTimeout calls outside it are not visible.
 *
 * @param {SourceCode} sourceCode
 * @param {any} node
 * @returns {any}
 */
function enclosingFunction(sourceCode, node) {
  const ancestors = sourceCode.getAncestors(node);
  for (let index = ancestors.length - 1; index >= 0; index--) {
    const current = ancestors[index];
    if (FUNCTION_TYPES.has(current.type) || current.type === 'Program') {
      return current;
    }
  }
  return ancestors[0] || node;
}

/**
 * Arrow functions use the `this` of the nearest function that has its own.
 *
 * @param {SourceCode} sourceCode
 * @param {any} node
 * @returns {any}
 */
function thisOwner(sourceCode, node) {
  const ancestors = sourceCode.getAncestors(node);
  for (let index = ancestors.length - 1; index >= 0; index--) {
    const current = ancestors[index];
    if (current.type === 'Program') {
      return current;
    }
    if (FUNCTION_TYPES.has(current.type) && current.type !== 'ArrowFunctionExpression') {
      return current;
    }
  }
  return null;
}

/** @type {WeakMap<any, number>} */
const nodeIds = new WeakMap();
let nextNodeId = 1;

/**
 * @param {any} node
 * @returns {number}
 */
function nodeId(node) {
  const existing = nodeIds.get(node);
  if (existing) {
    return existing;
  }
  const id = nextNodeId++;
  nodeIds.set(node, id);
  return id;
}

/**
 * Text of a property timer, stable for the same object binding and `this`.
 *
 * @param {SourceCode} sourceCode
 * @param {any} node
 * @returns {string | undefined}
 */
function memberKey(sourceCode, node) {
  const current = unwrap(node);
  if (!current || current.type !== 'MemberExpression' || current.computed) {
    return;
  }
  const property = current.property;
  if (!property || property.type !== 'Identifier') {
    return;
  }
  const objectKey = objectKeyOf(sourceCode, current.object);
  if (!objectKey) {
    return;
  }
  return `${objectKey}.${property.name}`;
}

/**
 * @param {SourceCode} sourceCode
 * @param {any} object
 * @returns {string | undefined}
 */
function objectKeyOf(sourceCode, object) {
  const current = unwrap(object);
  if (!current) {
    return;
  }
  if (current.type === 'ThisExpression') {
    const owner = thisOwner(sourceCode, current);
    return owner ? `this:${nodeId(owner)}` : undefined;
  }
  if (current.type === 'Identifier') {
    const variable = resolveVariable(sourceCode, current);
    return variable ? `var:${nodeId(variable)}` : `unresolved:${current.name}`;
  }
  if (current.type === 'MemberExpression') {
    return memberKey(sourceCode, current);
  }
}

/**
 * Last write of this binding that `accept` allows and that precedes `identifier`.
 * Only writes inside `enclosing` count. A non-matching overwrite does not erase an
 * earlier match, and a function declaration is visible throughout its scope.
 *
 * @param {SourceCode} sourceCode
 * @param {any} identifier
 * @param {any} enclosing
 * @param {(node: any) => boolean} accept
 * @returns {any}
 */
function latestMatchingWrite(sourceCode, identifier, enclosing, accept) {
  const variable = resolveVariable(sourceCode, identifier);
  const usagePos = identifier && identifier.range && identifier.range[0];
  if (!variable || usagePos == null) {
    return null;
  }

  let latest = null;
  let latestPos = -Infinity;

  /**
   * @param {number | undefined} pos
   * @param {any} expr
   * @param {any} locNode
   */
  const consider = (pos, expr, locNode) => {
    const value = unwrap(expr);
    if (!value || !locNode || pos == null || !isInside(enclosing, locNode)) {
      return;
    }
    if (pos >= usagePos || pos < latestPos || !accept(value)) {
      return;
    }
    latest = value;
    latestPos = pos;
  };

  for (const def of variable.defs || []) {
    if (def.type === 'FunctionName' && def.node && FUNCTION_TYPES.has(def.node.type)) {
      consider(-1, def.node, def.node);
    }
    if (
      def.type === 'Variable' &&
      def.node &&
      def.node.type === 'VariableDeclarator' &&
      def.node.init &&
      def.node.id
    ) {
      consider(def.node.id.range && def.node.id.range[0], def.node.init, def.node.id);
    }
  }
  for (const reference of variable.references || []) {
    if (reference.writeExpr && reference.identifier) {
      consider(
        reference.identifier.range && reference.identifier.range[0],
        reference.writeExpr,
        reference.identifier
      );
    }
  }
  return latest;
}

/**
 * @param {any} node
 * @returns {boolean}
 */
function isTimerMethod(node) {
  return (
    !!node &&
    node.type === 'MemberExpression' &&
    !node.computed &&
    node.property &&
    (node.property.name === 'unref' || node.property.name === 'ref')
  );
}

/**
 * Where the setTimeout return value is stored. `.unref()` and `.ref()` are ignored.
 *
 * @param {SourceCode} sourceCode
 * @param {any} call
 * @returns {{ variable?: Variable, unresolvedName?: string, memberKey?: string } | null}
 */
function assignedTimerTarget(sourceCode, call) {
  const ancestors = sourceCode.getAncestors(call);
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
    const left = parent.left;
    if (left && left.type === 'Identifier') {
      const variable = resolveVariable(sourceCode, left);
      return variable ? { variable } : { unresolvedName: left.name };
    }
    const key = memberKey(sourceCode, unwrap(left));
    return key ? { memberKey: key } : null;
  }
  if (parent.type === 'VariableDeclarator' && parent.id && parent.id.type === 'Identifier') {
    const variable = resolveVariable(sourceCode, parent.id);
    return variable ? { variable } : { unresolvedName: parent.id.name };
  }
  return null;
}

/**
 * @param {SourceCode} sourceCode
 * @param {any} identifier
 * @returns {boolean}
 */
function isClearTimeoutArgument(sourceCode, identifier) {
  const ancestors = sourceCode.getAncestors(identifier);
  let current = identifier;
  for (let index = ancestors.length - 1; index >= 0; index--) {
    const parent = ancestors[index];
    if (
      UNWRAP_TYPES.has(parent.type) &&
      (parent.expression === current || parent.argument === current)
    ) {
      current = parent;
      continue;
    }
    return (
      parent.type === 'CallExpression' &&
      parent.arguments &&
      parent.arguments[0] === current &&
      calleeName(parent.callee) === 'clearTimeout'
    );
  }
  return false;
}

/**
 * A clearTimeout inside the deadline callback runs only after the timer fires,
 * so it does not drop the closure when the other arm wins.
 *
 * @param {SourceCode} sourceCode
 * @param {{ node: any, target: { variable?: Variable, unresolvedName?: string, memberKey?: string } | null }} timer
 * @param {any} enclosing
 * @returns {boolean}
 */
function isTimerCleared(sourceCode, timer, enclosing) {
  const target = timer.target;
  if (!target) {
    return false;
  }
  const callback = unwrap(timer.node.arguments && timer.node.arguments[0]);

  if (target.variable) {
    return (target.variable.references || []).some((reference) => {
      const identifier = reference.identifier;
      if (!identifier || !isInside(enclosing, identifier) || isInside(callback, identifier)) {
        return false;
      }
      return isClearTimeoutArgument(sourceCode, identifier);
    });
  }

  let cleared = false;
  walk(
    enclosing,
    (node) => {
      if (cleared || node.type !== 'CallExpression' || calleeName(node.callee) !== 'clearTimeout') {
        return;
      }
      const argument = unwrap(node.arguments && node.arguments[0]);
      if (!argument || isInside(callback, node)) {
        return;
      }
      if (
        target.unresolvedName &&
        argument.type === 'Identifier' &&
        argument.name === target.unresolvedName &&
        !resolveVariable(sourceCode, argument)
      ) {
        cleared = true;
        return;
      }
      if (target.memberKey && memberKey(sourceCode, argument) === target.memberKey) {
        cleared = true;
      }
    },
    true
  );
  return cleared;
}

/**
 * @param {SourceCode} sourceCode
 * @param {any} executor
 * @returns {Set<Variable>}
 */
function settlerVariables(sourceCode, executor) {
  /** @type {Set<Variable>} */
  const settlers = new Set();
  const params = executor.params || [];
  for (let index = 0; index < Math.min(2, params.length); index++) {
    const param = params[index];
    if (param && param.type === 'Identifier') {
      const variable = resolveVariable(sourceCode, param);
      if (variable) {
        settlers.add(variable);
      }
    }
  }
  return settlers;
}

/**
 * True when `node` calls the executor's resolve or reject, following local functions.
 *
 * @param {SourceCode} sourceCode
 * @param {any} node
 * @param {any} enclosing
 * @param {Set<Variable>} settlers
 * @param {Set<any>} seen
 * @returns {boolean}
 */
function nodeSettles(sourceCode, node, enclosing, settlers, seen) {
  if (!node || seen.has(node)) {
    return false;
  }
  if (node.type === 'Identifier') {
    const variable = resolveVariable(sourceCode, node);
    if (variable && settlers.has(variable)) {
      return true;
    }
    const fn = latestMatchingWrite(sourceCode, node, enclosing, (value) =>
      FUNCTION_TYPES.has(value.type)
    );
    if (!fn || seen.has(fn)) {
      return false;
    }
    seen.add(fn);
    return bodySettles(sourceCode, fn, enclosing, settlers, seen);
  }
  if (FUNCTION_TYPES.has(node.type)) {
    seen.add(node);
    return bodySettles(sourceCode, node, enclosing, settlers, seen);
  }
  return false;
}

/**
 * @param {SourceCode} sourceCode
 * @param {any} fn
 * @param {any} enclosing
 * @param {Set<Variable>} settlers
 * @param {Set<any>} seen
 * @returns {boolean}
 */
function bodySettles(sourceCode, fn, enclosing, settlers, seen) {
  let settles = false;
  walk(
    fn.body || fn,
    (node) => {
      if (
        !settles &&
        node.type === 'CallExpression' &&
        node.callee &&
        node.callee.type === 'Identifier' &&
        nodeSettles(sourceCode, node.callee, enclosing, settlers, seen)
      ) {
        settles = true;
      }
    },
    true
  );
  return settles;
}

/**
 * @param {SourceCode} sourceCode
 * @param {any} call
 * @param {any} enclosing
 * @param {Set<Variable>} settlers
 * @returns {boolean}
 */
function callbackSettles(sourceCode, call, enclosing, settlers) {
  if (settlers.size === 0) {
    return false;
  }
  const callback = unwrap(call.arguments && call.arguments[0]);
  return nodeSettles(sourceCode, callback, enclosing, settlers, new Set());
}

/**
 * @param {SourceCode} sourceCode
 * @param {any} executor
 * @param {any} enclosing
 * @returns {Array<{ node: any, target: any }>}
 */
function deadlineTimers(sourceCode, executor, enclosing) {
  /** @type {Array<{ node: any, target: any }>} */
  const timers = [];
  const settlers = settlerVariables(sourceCode, executor);
  if (!executor.body) {
    return timers;
  }
  walk(
    executor.body,
    (node) => {
      if (!isSetTimeoutCall(node) || !callbackSettles(sourceCode, node, enclosing, settlers)) {
        return;
      }
      timers.push({ node, target: assignedTimerTarget(sourceCode, node) });
    },
    false
  );
  return timers;
}

/**
 * @param {SourceCode} sourceCode
 * @param {any} race
 * @param {any} enclosing
 * @returns {any[]}
 */
function raceExecutors(sourceCode, race, enclosing) {
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
      arm = latestMatchingWrite(sourceCode, arm, enclosing, isNewPromise);
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
    /** @type {SourceCode} */
    let sourceCode;

    return {
      before() {
        sourceCode = context.sourceCode;
      },
      CallExpression(node) {
        if (!isPromiseRace(node)) {
          return;
        }
        const enclosing = enclosingFunction(sourceCode, node);
        for (const executor of raceExecutors(sourceCode, node, enclosing)) {
          for (const timer of deadlineTimers(sourceCode, executor, enclosing)) {
            if (isTimerCleared(sourceCode, timer, enclosing)) {
              continue;
            }
            context.report({ node: timer.node, messageId: 'uncleared' });
          }
        }
      },
    };
  },
};
