/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Flags AbortSignal.timeout() and a timeoutSignal() whose timer is never cleared.
 *
 * AbortSignal.timeout() keeps the signal, and every abort listener, alive until
 * the deadline. timeoutSignal() from @kbn/std is the replacement: dispose it
 * when the work settles (`using`, or dispose() in a finally).
 *
 * This is a direct check. It treats a `using` binding, or a dispose() in a
 * `finally` (try or promise `.finally()`) that covers every use of that
 * binding, as cleared. A dispose() on the success path does not count. It
 * does not follow helpers.
 * The fixer rewrites a binding, or an awaited inline call, to timeoutSignal()
 * inside try/finally. Lines that begin inside a template literal stay put, so
 * the fix does not change string values. Prettier 2.8 cannot parse `using`,
 * so the fixer does not emit it. Values that escape the function, and calls
 * that are not awaited, are reported without a fix.
 */

const FUNCTION_TYPES = new Set([
  'FunctionDeclaration',
  'FunctionExpression',
  'ArrowFunctionExpression',
]);

const UNWRAP_TYPES = new Set([
  'ChainExpression',
  'ParenthesizedExpression',
  'TSAsExpression',
  'TSNonNullExpression',
  'TSSatisfiesExpression',
  'TSTypeAssertion',
]);

const STATEMENT_TYPES = new Set([
  'BlockStatement',
  'BreakStatement',
  'ClassDeclaration',
  'ContinueStatement',
  'DebuggerStatement',
  'DoWhileStatement',
  'EmptyStatement',
  'ExportDefaultDeclaration',
  'ExportNamedDeclaration',
  'ExpressionStatement',
  'ForInStatement',
  'ForOfStatement',
  'ForStatement',
  'FunctionDeclaration',
  'IfStatement',
  'LabeledStatement',
  'ReturnStatement',
  'SwitchStatement',
  'ThrowStatement',
  'TryStatement',
  'VariableDeclaration',
  'WhileStatement',
  'WithStatement',
]);

const MUTABLE_KINDS = new Set(['const', 'let', 'var']);

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
 */
function walk(node, visit) {
  visit(node);
  for (const child of childNodes(node)) {
    walk(child, visit);
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
  if (node.type === 'MemberExpression' && !node.computed && node.property?.type === 'Identifier') {
    return node.property.name;
  }
}

/**
 * @param {any} node
 */
function isAbortSignalTimeoutCall(node) {
  return (
    node.type === 'CallExpression' &&
    node.callee?.type === 'MemberExpression' &&
    calleeName(node.callee) === 'timeout' &&
    unwrap(node.callee.object)?.type === 'Identifier' &&
    unwrap(node.callee.object)?.name === 'AbortSignal'
  );
}

/**
 * @param {any} node
 */
function isTimeoutSignalCall(node) {
  return (
    node.type === 'CallExpression' &&
    node.callee?.type === 'Identifier' &&
    node.callee.name === 'timeoutSignal'
  );
}

/**
 * @param {any} node
 * @returns {any}
 */
function enclosingFunction(node) {
  let current = node.parent;
  while (current) {
    if (FUNCTION_TYPES.has(current.type)) {
      return current;
    }
    current = current.parent;
  }
  return node.parent ? null : node;
}

/**
 * @param {any} node
 */
function isDisposeMember(node) {
  if (!node || node.type !== 'MemberExpression' || node.object?.type !== 'Identifier') {
    return false;
  }
  if (!node.computed) {
    return node.property?.type === 'Identifier' && node.property.name === 'dispose';
  }
  const property = node.property;
  return (
    property?.type === 'MemberExpression' &&
    !property.computed &&
    property.object?.type === 'Identifier' &&
    property.object.name === 'Symbol' &&
    property.property?.type === 'Identifier' &&
    property.property.name === 'dispose'
  );
}

/**
 * @param {any} node
 * @param {string} name
 */
function isDisposeCall(node, name) {
  return (
    node.type === 'CallExpression' &&
    isDisposeMember(node.callee) &&
    node.callee.object.name === name
  );
}

/**
 * @param {any} parent
 * @param {any} node
 */
function containsRange(parent, node) {
  return (
    !!parent?.range &&
    !!node?.range &&
    node.range[0] >= parent.range[0] &&
    node.range[1] <= parent.range[1]
  );
}

/**
 * Walk `root`'s body without entering nested functions.
 *
 * @param {any} root
 * @param {(node: any) => void} visit
 */
function walkOwnBody(root, visit) {
  /**
   * @param {any} node
   */
  const walkChildren = (node) => {
    if (!node || typeof node.type !== 'string' || FUNCTION_TYPES.has(node.type)) {
      return;
    }
    visit(node);
    for (const child of childNodes(node)) {
      walkChildren(child);
    }
  };
  for (const child of childNodes(root)) {
    walkChildren(child);
  }
}

/**
 * @param {any} node
 */
function isDeclarationId(node) {
  const parent = node.parent;
  if (!parent) {
    return false;
  }
  if (parent.type === 'VariableDeclarator' && parent.id === node) {
    return true;
  }
  if (parent.type === 'CatchClause' && parent.param === node) {
    return true;
  }
  if (FUNCTION_TYPES.has(parent.type)) {
    return parent.id === node || parent.params?.includes(node);
  }
  return false;
}

/**
 * Property names and type positions are not uses of the binding.
 *
 * @param {any} node
 */
function isValueReference(node) {
  const parent = node.parent;
  if (!parent) {
    return false;
  }
  if (parent.type === 'MemberExpression' && parent.property === node && !parent.computed) {
    return false;
  }
  if (
    (parent.type === 'Property' || parent.type === 'ObjectProperty') &&
    parent.key === node &&
    !parent.computed &&
    !parent.shorthand
  ) {
    return false;
  }
  let current = parent;
  while (current && !FUNCTION_TYPES.has(current.type)) {
    if (
      (current.type === 'TSAsExpression' ||
        current.type === 'TSSatisfiesExpression' ||
        current.type === 'TSTypeAssertion' ||
        current.type === 'TSNonNullExpression') &&
      containsRange(current.expression, node)
    ) {
      current = current.parent;
      continue;
    }
    if (typeof current.type === 'string' && current.type.startsWith('TS')) {
      return false;
    }
    current = current.parent;
  }
  return true;
}

/**
 * `try` whose `finally` contains this dispose call, in `scope` and not in a nested function.
 *
 * @param {any} disposeCall
 * @param {any} scope
 * @returns {any | null}
 */
function tryStatementFinalizer(disposeCall, scope) {
  let current = disposeCall.parent;
  while (current && current !== scope) {
    if (FUNCTION_TYPES.has(current.type)) {
      return null;
    }
    if (
      current.type === 'TryStatement' &&
      current.finalizer &&
      containsRange(current.finalizer, disposeCall)
    ) {
      let parent = current.parent;
      while (parent && parent !== scope) {
        if (FUNCTION_TYPES.has(parent.type)) {
          return null;
        }
        parent = parent.parent;
      }
      return parent === scope ? current : null;
    }
    current = current.parent;
  }
  return null;
}

/**
 * Call to `.finally()` whose callback contains this dispose call.
 *
 * @param {any} disposeCall
 * @param {any} scope
 * @returns {any | null}
 */
function promiseFinallyCall(disposeCall, scope) {
  const fn = enclosingFunction(disposeCall);
  if (!fn || fn === scope) {
    return null;
  }

  let argument = fn;
  let parent = fn.parent;
  while (parent && UNWRAP_TYPES.has(parent.type)) {
    argument = parent;
    parent = parent.parent;
  }
  if (parent?.type !== 'CallExpression' || !parent.arguments?.includes(argument)) {
    return null;
  }

  const callee = unwrap(parent.callee);
  if (
    callee?.type !== 'MemberExpression' ||
    callee.computed ||
    callee.property?.type !== 'Identifier' ||
    callee.property.name !== 'finally'
  ) {
    return null;
  }

  let current = parent;
  while (current && current !== scope) {
    if (FUNCTION_TYPES.has(current.type)) {
      return null;
    }
    current = current.parent;
  }
  return current === scope ? parent : null;
}

/**
 * True when `name` is disposed on the settlement path, and every use in this
 * function sits inside that `try` or promise `.finally()` call.
 *
 * @param {any} scope
 * @param {string} name
 */
function hasDisposeCall(scope, name) {
  if (!scope) {
    return false;
  }

  /** @type {any[]} */
  const regions = [];
  walk(scope, (node) => {
    if (!isDisposeCall(node, name)) {
      return;
    }
    const tryStatement = tryStatementFinalizer(node, scope);
    if (tryStatement) {
      regions.push(tryStatement);
      return;
    }
    const promiseFinally = promiseFinallyCall(node, scope);
    if (promiseFinally) {
      regions.push(promiseFinally);
    }
  });
  if (regions.length === 0) {
    return false;
  }

  let covered = true;
  walkOwnBody(scope, (node) => {
    if (!covered || node.type !== 'Identifier' || node.name !== name) {
      return;
    }
    if (!isValueReference(node) || isDeclarationId(node)) {
      return;
    }
    if (!regions.some((region) => containsRange(region, node))) {
      covered = false;
    }
  });
  return covered;
}

/**
 * True when `using` will dispose this call's result.
 * Climbs ternaries and `??` / `&&` / `||`, not other calls.
 *
 * @param {any} call
 */
function isUsingInitializer(call) {
  let current = call;
  while (current.parent) {
    const parent = current.parent;
    if (UNWRAP_TYPES.has(parent.type)) {
      current = parent;
      continue;
    }
    if (parent.type === 'ConditionalExpression' && parent.test !== current) {
      current = parent;
      continue;
    }
    if (parent.type === 'LogicalExpression') {
      current = parent;
      continue;
    }
    if (parent.type !== 'VariableDeclarator' || parent.init !== current) {
      return false;
    }
    const declaration = parent.parent;
    return (
      declaration?.type === 'VariableDeclaration' &&
      (declaration.kind === 'using' || declaration.kind === 'await using')
    );
  }
  return false;
}

/**
 * Variable declarator whose initializer contains this call via ternaries only.
 *
 * @param {any} call
 * @returns {any | null}
 */
function initializerBinding(call) {
  let current = call;
  while (current.parent) {
    const parent = current.parent;
    if (
      UNWRAP_TYPES.has(parent.type) &&
      (parent.expression === current || parent.argument === current)
    ) {
      current = parent;
      continue;
    }
    if (parent.type === 'ConditionalExpression' && parent.test !== current) {
      current = parent;
      continue;
    }
    if (parent.type === 'LogicalExpression') {
      current = parent;
      continue;
    }
    if (
      parent.type === 'VariableDeclarator' &&
      parent.init === current &&
      parent.id?.type === 'Identifier'
    ) {
      return parent;
    }
    return null;
  }
  return null;
}

/**
 * @param {any} call
 * @returns {any | null}
 */
function simpleBinding(call) {
  let init = call;
  while (
    init.parent &&
    UNWRAP_TYPES.has(init.parent.type) &&
    (init.parent.expression || init.parent.argument) === init
  ) {
    init = init.parent;
  }
  const declarator = init.parent;
  if (
    !declarator ||
    declarator.type !== 'VariableDeclarator' ||
    declarator.init !== init ||
    declarator.id?.type !== 'Identifier'
  ) {
    return null;
  }
  const declaration = declarator.parent;
  if (
    declaration?.type !== 'VariableDeclaration' ||
    declaration.declarations.length !== 1 ||
    (declaration.parent?.type !== 'BlockStatement' && declaration.parent?.type !== 'Program')
  ) {
    return null;
  }
  return declarator;
}

/**
 * @param {any} node
 */
function hasAwaitAncestor(node) {
  let current = node.parent;
  while (current) {
    if (FUNCTION_TYPES.has(current.type)) {
      return false;
    }
    if (current.type === 'AwaitExpression') {
      return true;
    }
    current = current.parent;
  }
  return false;
}

/**
 * @param {any} node
 * @returns {any | null}
 */
function owningStatement(node) {
  let current = node;
  while (current.parent && !STATEMENT_TYPES.has(current.type)) {
    if (FUNCTION_TYPES.has(current.parent.type)) {
      return null;
    }
    current = current.parent;
  }
  if (!STATEMENT_TYPES.has(current.type)) {
    return null;
  }
  if (current.parent?.type !== 'BlockStatement' && current.parent?.type !== 'Program') {
    return null;
  }
  return current;
}

/**
 * @param {any} block
 * @param {string} name
 * @param {any} declaratorId
 */
function bindingIsCovered(block, name, declaratorId) {
  let covered = true;

  /**
   * @param {any} node
   * @param {boolean} nested
   */
  function visit(node, nested) {
    if (!covered) {
      return;
    }
    if (nested) {
      if (node.type === 'Identifier' && node.name === name && !isDisposeCall(node.parent, name)) {
        // A nested dispose() still clears the timer. Any other capture can outlive the block.
        if (!(isDisposeMember(node.parent) && node.parent.object === node)) {
          covered = false;
        }
      }
      for (const child of childNodes(node)) {
        visit(child, true);
      }
      return;
    }

    if (FUNCTION_TYPES.has(node.type)) {
      for (const child of childNodes(node)) {
        visit(child, true);
      }
      return;
    }

    if (
      node.type === 'AssignmentExpression' &&
      node.left?.type === 'Identifier' &&
      node.left.name === name
    ) {
      covered = false;
      return;
    }

    if (node.type === 'Identifier' && node.name === name && node !== declaratorId) {
      const disposeObject = isDisposeMember(node.parent) && node.parent.object === node;
      if (!disposeObject && !hasAwaitAncestor(node)) {
        covered = false;
        return;
      }
    }

    for (const child of childNodes(node)) {
      visit(child, false);
    }
  }

  visit(block, false);
  return covered;
}

/**
 * Leading whitespace of the line that starts `node`, when `node` is the first
 * token on that line. The insertion point is the line start, before that indent.
 *
 * @param {any} node
 * @param {any} source
 * @returns {{ index: number, indent: string } | null}
 */
function statementLine(node, source) {
  if (!node?.range) {
    return null;
  }
  const text = source.getText();
  let index = node.range[0];
  while (index > 0 && text[index - 1] !== '\n') {
    index--;
  }
  const indent = text.slice(index, node.range[0]);
  if (!/^[ \t]*$/.test(indent)) {
    return null;
  }
  return { index, indent };
}

/**
 * @param {any} call
 * @param {any} source
 */
function argsText(call, source) {
  const text = source.getText(call);
  const open = text.indexOf('(');
  const close = text.lastIndexOf(')');
  if (open < 0 || close < open) {
    return '';
  }
  return text.slice(open + 1, close);
}

/**
 * @param {any} program
 */
function collectNames(program) {
  /** @type {Set<string>} */
  const names = new Set();
  walk(program, (node) => {
    if (node.type === 'Identifier' && typeof node.name === 'string') {
      names.add(node.name);
    }
  });
  return names;
}

/**
 * @param {Set<string>} names
 */
function freshName(names) {
  const base = 'deadline';
  if (!names.has(base)) {
    names.add(base);
    return base;
  }
  let index = 2;
  while (names.has(`${base}${index}`)) {
    index++;
  }
  const name = `${base}${index}`;
  names.add(name);
  return name;
}

/**
 * @param {any} program
 */
function kbnStdValueImport(program) {
  for (const node of program.body || []) {
    if (
      node.type === 'ImportDeclaration' &&
      node.source?.value === '@kbn/std' &&
      node.importKind !== 'type'
    ) {
      return node;
    }
  }
  return null;
}

/**
 * Index just after the shebang and leading comments, where a new import belongs.
 *
 * @param {string} text
 */
function leadingTriviaEnd(text) {
  let index = 0;
  if (text.startsWith('#!')) {
    const newline = text.indexOf('\n');
    index = newline === -1 ? text.length : newline + 1;
  }
  while (index < text.length) {
    if (text.startsWith('/*', index)) {
      const end = text.indexOf('*/', index);
      if (end === -1) {
        break;
      }
      index = end + 2;
      continue;
    }
    if (text.startsWith('//', index)) {
      const newline = text.indexOf('\n', index);
      index = newline === -1 ? text.length : newline + 1;
      continue;
    }
    const blank = text.slice(index).match(/^[ \t]*\r?\n/);
    if (blank) {
      index += blank[0].length;
      continue;
    }
    break;
  }
  return index;
}

/**
 * @param {any} fixer
 * @param {any} program
 * @param {any} source
 */
function importFix(fixer, program, source) {
  const existing = kbnStdValueImport(program);
  if (existing) {
    const specifiers = existing.specifiers || [];
    const already = specifiers.some(
      (specifier) =>
        specifier.type === 'ImportSpecifier' &&
        (specifier.imported?.name === 'timeoutSignal' || specifier.local?.name === 'timeoutSignal')
    );
    if (already) {
      return null;
    }
    const named = specifiers.filter((specifier) => specifier.type === 'ImportSpecifier');
    if (named.length === specifiers.length && named.length > 0) {
      return fixer.insertTextAfter(named[named.length - 1], ', timeoutSignal');
    }
    return fixer.insertTextAfter(existing, `\nimport { timeoutSignal } from '@kbn/std';`);
  }

  const index = leadingTriviaEnd(source.getText());
  const insert = `import { timeoutSignal } from '@kbn/std';\n`;
  if (index === 0) {
    return fixer.insertTextBeforeRange([0, 0], insert);
  }
  return fixer.insertTextAfterRange([index, index], insert);
}

/**
 * @param {string} text
 * @param {number} base
 * @param {{ range: number[], text: string }[]} replacements
 */
function applyReplacements(text, base, replacements) {
  const sorted = [...replacements].sort((left, right) => right.range[0] - left.range[0]);
  let result = text;
  for (const replacement of sorted) {
    const start = replacement.range[0] - base;
    const end = replacement.range[1] - base;
    result = result.slice(0, start) + replacement.text + result.slice(end);
  }
  return result;
}

/**
 * Template-element ranges inside `region`, shifted by hoist replacements so they
 * match the text `indentLines` receives. A call sits in an interpolation, never
 * inside an element, so a replacement only slides later ranges.
 *
 * @param {any} block
 * @param {number[]} regionRange
 * @param {{ name: string, call: any }[]} hoists
 * @returns {number[][]}
 */
function protectedTemplateRanges(block, regionRange, hoists) {
  /** @type {number[][]} */
  let ranges = [];
  walk(block, (node) => {
    if (node.type !== 'TemplateElement' || !node.range) {
      return;
    }
    const start = Math.max(node.range[0], regionRange[0]);
    const end = Math.min(node.range[1], regionRange[1]);
    if (start < end) {
      ranges.push([start, end]);
    }
  });

  const edits = hoists
    .filter((hoist) => hoist.call?.range)
    .map((hoist) => ({
      start: hoist.call.range[0],
      end: hoist.call.range[1],
      delta: hoist.name.length - (hoist.call.range[1] - hoist.call.range[0]),
    }))
    .sort((left, right) => right.start - left.start);

  for (const edit of edits) {
    ranges = ranges.map(([start, end]) => {
      if (end <= edit.start) {
        return [start, end];
      }
      if (start >= edit.end) {
        return [start + edit.delta, end + edit.delta];
      }
      return [start, end];
    });
  }

  const base = regionRange[0];
  return ranges.map(([start, end]) => [start - base, end - base]);
}

/**
 * Indent code lines, but leave a line that begins inside a template literal
 * unchanged. Those characters are the string value.
 *
 * @param {string} text
 * @param {number[][]} [protectedRanges]
 */
function indentLines(text, protectedRanges) {
  let offset = 0;
  return text
    .split('\n')
    .map((line) => {
      const start = offset;
      offset += line.length + 1;
      const insideTemplate = protectedRanges?.some(
        ([rangeStart, rangeEnd]) => start >= rangeStart && start < rangeEnd
      );
      if (insideTemplate || line.trim() === '') {
        return line;
      }
      return `  ${line}`;
    })
    .join('\n');
}

/**
 * One try/finally for every timeout created in a block. Declarations stay
 * before the try so `finally` can still see them.
 *
 * @param {any[]} wraps
 * @param {any} source
 * @returns {any | null}
 */
function buildBlockWrap(wraps, source) {
  const block = wraps[0].wrap.block;
  const body = block.body;
  if (!Array.isArray(body) || body.length === 0) {
    return null;
  }

  const preludes = wraps.map((plan) => plan.wrap.prelude).filter(Boolean);
  const hoists = wraps.flatMap((plan) => plan.wrap.hoists);
  const lastPrelude = preludes.reduce(
    (best, node) => (!best || node.range[0] > best.range[0] ? node : best),
    null
  );
  const firstHoist = hoists.reduce(
    (best, hoist) => (!best || hoist.call.range[0] < best.call.range[0] ? hoist : best),
    null
  );
  if (lastPrelude && firstHoist && lastPrelude.range[0] > firstHoist.call.range[0]) {
    return null;
  }

  /** @type {any} */
  let regionFirst = null;
  if (lastPrelude) {
    const index = body.indexOf(lastPrelude);
    regionFirst = index >= 0 ? body[index + 1] : null;
  } else if (firstHoist) {
    regionFirst = owningStatement(firstHoist.call);
  }

  const disposeNames = [
    ...wraps.map((plan) => plan.wrap.disposeName).filter(Boolean),
    ...hoists.map((hoist) => hoist.name),
  ];
  const callees = wraps.map((plan) => plan.wrap.callee).filter(Boolean);

  if (!regionFirst) {
    return lastPrelude
      ? {
          lastPrelude,
          regionLine: null,
          hoists,
          disposeNames,
          callees,
          body: '',
          regionRange: null,
        }
      : null;
  }

  const regionLine = statementLine(regionFirst, source);
  const last = body[body.length - 1];
  if (!regionLine || !last?.range || last.range[1] < regionLine.index) {
    return null;
  }

  const regionRange = [regionLine.index, last.range[1]];
  const inRegion = hoists.every(
    (hoist) => hoist.call.range[0] >= regionRange[0] && hoist.call.range[1] <= regionRange[1]
  );
  if (!inRegion) {
    return null;
  }

  const text = source.getText();
  return {
    lastPrelude,
    regionLine,
    hoists,
    disposeNames,
    callees,
    regionRange,
    protectedRanges: protectedTemplateRanges(block, regionRange, hoists),
    body: applyReplacements(
      text.slice(regionRange[0], regionRange[1]),
      regionRange[0],
      hoists.map((hoist) => ({ range: hoist.call.range, text: hoist.name }))
    ),
  };
}

/**
 * @param {string} indent
 * @param {{ name: string, args: string }[]} hoists
 * @param {string[]} disposeNames
 * @param {string} body
 * @param {number[][]} [protectedRanges]
 */
function buildWrappedRegion(indent, hoists, disposeNames, body, protectedRanges) {
  const hoistText = hoists
    .map((entry) => `${indent}const ${entry.name} = timeoutSignal(${entry.args});\n`)
    .join('');
  const disposeText = disposeNames.map((name) => `${indent}  ${name}.dispose();`).join('\n');
  return `${hoistText}${indent}try {\n${indentLines(
    body,
    protectedRanges
  )}\n${indent}} finally {\n${disposeText}\n${indent}}`;
}

/**
 * @param {any[]} reports
 * @param {any} fixer
 * @param {any} source
 * @param {any} program
 * @param {boolean} includeImport
 */
function fixesFor(reports, fixer, source, program, includeImport) {
  /** @type {any[]} */
  const fixes = [];
  if (includeImport) {
    const imported = importFix(fixer, program, source);
    if (imported) {
      fixes.push(imported);
    }
  }
  for (const report of reports) {
    fixes.push(...report.edits(fixer, source));
  }
  return fixes;
}

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    fixable: 'code',
    docs: {
      description:
        'Disallow AbortSignal.timeout(), which retains abort listeners until the deadline. Use timeoutSignal() from @kbn/std and dispose it.',
    },
    schema: [],
    messages: {
      abortSignalTimeout:
        'AbortSignal.timeout() keeps the signal and its abort listeners alive until the deadline. Use timeoutSignal() from @kbn/std and call dispose() in a finally when the work settles.',
      undisposed:
        'Dispose this timeoutSignal() when the work settles. Call dispose() in a finally so the timer does not keep abort listeners alive until the deadline.',
    },
  },
  createOnce(context) {
    return {
      Program(program) {
        linkParents(program);
        const source = context.sourceCode || context.getSourceCode();
        /** @type {any[]} */
        const calls = [];
        walk(program, (node) => {
          if (isAbortSignalTimeoutCall(node) || isTimeoutSignalCall(node)) {
            calls.push(node);
          }
        });
        calls.sort((left, right) => left.range[0] - right.range[0]);

        const names = collectNames(program);
        /** @type {any[]} */
        const plans = [];
        /** @type {Map<any, any[]>} */
        const inlineGroups = new Map();
        /** @type {Map<any, any[]>} */
        const wrapsByBlock = new Map();

        for (const call of calls) {
          const timeoutApi = isAbortSignalTimeoutCall(call);
          const binding = simpleBinding(call);
          const disposedBinding = binding || initializerBinding(call);
          const disposedByUsing = isUsingInitializer(call);
          const bindingName = disposedBinding?.id?.name;
          const scope = disposedBinding ? enclosingFunction(disposedBinding) || program : null;
          const disposedByCall = bindingName ? hasDisposeCall(scope, bindingName) : false;

          if (!timeoutApi && (disposedByUsing || disposedByCall)) {
            continue;
          }

          /** @type {any} */
          const plan = {
            call,
            messageId: timeoutApi ? 'abortSignalTimeout' : 'undisposed',
            edits: null,
          };

          if ((disposedByUsing || disposedByCall) && timeoutApi) {
            plan.edits = (fixer) => [fixer.replaceText(call.callee, 'timeoutSignal')];
          } else if (
            binding &&
            MUTABLE_KINDS.has(binding.parent.kind) &&
            bindingIsCovered(binding.parent.parent, bindingName, binding.id)
          ) {
            plan.wrap = {
              block: binding.parent.parent,
              prelude: binding.parent,
              disposeName: bindingName,
              callee: timeoutApi ? call.callee : null,
              hoists: [],
            };
            const group = wrapsByBlock.get(plan.wrap.block) || [];
            group.push(plan);
            wrapsByBlock.set(plan.wrap.block, group);
          } else if (hasAwaitAncestor(call)) {
            const statement = owningStatement(call);
            const line = statement ? statementLine(statement, source) : null;
            if (statement && line) {
              const name = freshName(names);
              plan.hoist = { name, args: argsText(call, source), call };
              const group = inlineGroups.get(statement) || [];
              group.push(plan);
              inlineGroups.set(statement, group);
            }
          }

          plans.push(plan);
        }

        for (const group of inlineGroups.values()) {
          const statement = owningStatement(group[0].call);
          const block = statement.parent;
          for (const entry of group) {
            entry.wrap = {
              block,
              prelude: null,
              disposeName: null,
              callee: null,
              hoists: [entry.hoist],
            };
            const wraps = wrapsByBlock.get(block) || [];
            wraps.push(entry);
            wrapsByBlock.set(block, wraps);
          }
        }

        for (const wraps of wrapsByBlock.values()) {
          const built = buildBlockWrap(wraps, source);
          if (!built) {
            continue;
          }
          const owner = wraps[0];
          const line = built.regionLine;
          const isImportOwner = !plans.some((plan) => plan.edits);
          const importAtStatement =
            isImportOwner &&
            !kbnStdValueImport(program) &&
            line !== null &&
            leadingTriviaEnd(source.getText()) === line.index;
          if (importAtStatement) {
            owner.skipSharedImport = true;
          }
          owner.edits = (fixer) => {
            /** @type {any[]} */
            const edits = built.callees.map((callee) => fixer.replaceText(callee, 'timeoutSignal'));
            if (!built.regionLine) {
              const indent = statementLine(built.lastPrelude, source)?.indent || '';
              const dispose = built.disposeNames
                .map((name) => `\n${indent}${name}.dispose();`)
                .join('');
              edits.push(fixer.insertTextAfter(built.lastPrelude, dispose));
              return edits;
            }
            let wrapped = buildWrappedRegion(
              built.regionLine.indent,
              built.hoists,
              built.disposeNames,
              built.body,
              built.protectedRanges
            );
            if (importAtStatement) {
              wrapped = `import { timeoutSignal } from '@kbn/std';\n${wrapped}`;
            }
            edits.push(fixer.replaceTextRange(built.regionRange, wrapped));
            return edits;
          };
          for (const extra of wraps.slice(1)) {
            extra.edits = null;
          }
        }

        const importOwner = plans.find((plan) => plan.edits);

        for (const plan of plans) {
          context.report({
            node: plan.call,
            messageId: plan.messageId,
            fix: plan.edits
              ? (fixer) =>
                  fixesFor(
                    [plan],
                    fixer,
                    source,
                    program,
                    plan === importOwner && !plan.skipSharedImport
                  )
              : undefined,
          });
        }
      },
    };
  },
};
