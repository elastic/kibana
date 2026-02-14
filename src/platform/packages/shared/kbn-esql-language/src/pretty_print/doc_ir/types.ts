/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * The document intermediate representation.
 *
 * - `string` — literal text (must not contain newline characters).
 * - `Doc[]` — concatenation of documents, rendered left to right.
 * - `DocCommand` — a formatting instruction node.
 */
export type Doc = string | Doc[] | DocCommand;

/**
 * Discriminated union of all document commands.
 */
export type DocCommand =
  | GroupDoc
  | FillDoc
  | IndentDoc
  | IndentIfBreakDoc
  | AlignDoc
  | IfBreakDoc
  | LineDoc
  | LineSuffixDoc
  | LineSuffixBoundaryDoc
  | BreakParentDoc
  | LabelDoc
  | TrimDoc
  | CursorDoc;

/**
 * The core break-decision unit. The layout engine first tries to render
 * `contents` entirely on one line (flat mode). If the result exceeds the
 * remaining line width, it switches to break mode — replacing every `line`
 * and `softline` inside with a newline + indentation.
 *
 * When `expandedStates` is provided this becomes a **conditional group**
 * (aka `conditionalGroup`): the engine tries each state in order (most
 * compact first) and uses the first one that fits. If none fits, the last
 * state is rendered in break mode.
 *
 * Setting `shouldBreak` to `true` forces break mode unconditionally.
 *
 * An `id` allows other commands (`ifBreak`, `indentIfBreak`) to query
 * this group's resolved mode.
 */
export interface GroupDoc {
  readonly type: 'group';
  readonly contents: Doc;
  readonly shouldBreak?: boolean;
  readonly id?: symbol;
  readonly expandedStates?: readonly Doc[];
}

/**
 * Wrapping layout: packs as many items per line as possible, breaking to a
 * new line only when the next item would exceed the line width.
 *
 * `parts` must alternate between content docs and line-break docs:
 * `[item1, line, item2, line, item3, ...]`
 *
 * Unlike `group` (all-or-nothing), `fill` makes per-item break decisions,
 * producing partially filled lines.
 */
export interface FillDoc {
  readonly type: 'fill';
  readonly parts: Doc[];
}

/**
 * Increases indentation by one tab level for `contents`.
 */
export interface IndentDoc {
  readonly type: 'indent';
  readonly contents: Doc;
}

/**
 * Conditionally indents `contents` based on whether the group identified
 * by `groupId` is in break mode. An optimized form of
 * `ifBreak(indent(doc), doc, { groupId })`.
 *
 * When `negate` is `true` the behavior is inverted: indent when the
 * referenced group is flat, don't indent when broken.
 */
export interface IndentIfBreakDoc {
  readonly type: 'indent-if-break';
  readonly contents: Doc;
  readonly groupId: symbol;
  readonly negate?: boolean;
}

/**
 * Increases indentation by a fixed number of spaces rather than a full
 * tab level. Useful for alignment that doesn't match the configured tab
 * width.
 *
 * Special values for `n`:
 * - Positive integer — add `n` spaces of alignment.
 * - `-1` — dedent by one level (reverses one `indent` or `align`).
 * - `Number.NEGATIVE_INFINITY` — reset indentation to the root level.
 * - `{ type: 'root' }` — mark current indentation as the root position
 *   for `literalline`.
 */
export interface AlignDoc {
  readonly type: 'align';
  readonly n: number | { type: 'root' };
  readonly contents: Doc;
}

/**
 * Emits `breakContents` when the enclosing group (or the group identified
 * by `groupId`) is in break mode, or `flatContents` when it renders flat.
 *
 * Common use cases: trailing commas only in broken lists, different
 * separators depending on layout mode.
 */
export interface IfBreakDoc {
  readonly type: 'if-break';
  readonly breakContents: Doc;
  readonly flatContents: Doc;
  readonly groupId?: symbol;
}

/**
 * A line-break command whose behavior depends on the enclosing group's mode:
 *
 * | `soft` | `hard` | `literal` | Flat mode        | Break mode         |
 * |--------|--------|-----------|------------------|--------------------|
 * | false  | false  | false     | space `" "`      | newline + indent   | → `line`
 * | true   | false  | false     | nothing `""`     | newline + indent   | → `softline`
 * | false  | true   | false     | newline + indent | newline + indent   | → `hardline`
 * | false  | true   | true      | newline + root   | newline + root     | → `literalline`
 *
 * When `literal` is `true`, the newline preserves trailing whitespace on
 * the preceding line and indents to the root position (set by `markAsRoot`)
 * rather than the current nesting level. Used for embedded/template content.
 */
export interface LineDoc {
  readonly type: 'line';
  readonly soft?: boolean;
  readonly hard?: boolean;
  readonly literal?: boolean;
}

/**
 * Buffers `contents` and emits them at the end of the current line, just
 * before the next line break. Used for trailing comments.
 *
 * Example: `[text("x"), lineSuffix(" // comment"), text(";"), hardline]`
 * produces: `x; // comment\n`
 *
 * Without `lineSuffix`, the comment would appear before the semicolon.
 */
export interface LineSuffixDoc {
  readonly type: 'line-suffix';
  readonly contents: Doc;
}

/**
 * Forces any buffered `lineSuffix` content to be flushed at this point
 * rather than waiting for a natural line break. Prevents trailing comments
 * from leaking across syntactic boundaries (e.g., past a closing brace).
 */
export interface LineSuffixBoundaryDoc {
  readonly type: 'line-suffix-boundary';
}

/**
 * Forces all ancestor groups to break. Paired with `hardline` to ensure
 * that a hard line break propagates upward through the group hierarchy.
 *
 * Processed during the `propagateBreaks` pre-pass which walks the Doc
 * tree and sets `shouldBreak` on every enclosing `GroupDoc`.
 */
export interface BreakParentDoc {
  readonly type: 'break-parent';
}

/**
 * Annotates a doc with an opaque label for heuristic introspection by
 * language-specific printers. Has no effect on layout. Useful when a
 * printer needs to inspect sub-docs (e.g., "is this a method chain?").
 */
export interface LabelDoc {
  readonly type: 'label';
  readonly label: unknown;
  readonly contents: Doc;
}

/**
 * Removes trailing whitespace from the output at the current position.
 */
export interface TrimDoc {
  readonly type: 'trim';
}

/**
 * Placeholder for cursor position tracking. The layout engine emits a
 * sentinel character at this position; after layout, the caller can
 * locate the cursor in the output string. Useful for editor
 * format-on-save integrations that need to preserve cursor position.
 */
export interface CursorDoc {
  readonly type: 'cursor';
}
