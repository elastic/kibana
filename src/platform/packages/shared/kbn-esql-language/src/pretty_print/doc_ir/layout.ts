/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { hardlineWithoutBreakParent } from './builders';
import { propagateBreaks } from './prepare';
import type { Doc, FillNode } from './types';

const MODE_FLAT = 'flat' as const;
const MODE_BREAK = 'break' as const;
type Mode = typeof MODE_FLAT | typeof MODE_BREAK;

interface Indent {
  /** Total number of characters this indent occupies. */
  readonly length: number;
  /** The actual whitespace string to emit. */
  readonly value: string;
  /** Root indent level saved by `markAsRoot`, used by `literalline`. */
  readonly root?: Indent;
}

const makeIndent = (current: Indent, options: { tabWidth: number; useTabs: boolean }): Indent => {
  const added = options.useTabs ? '\t' : ' '.repeat(options.tabWidth);
  return {
    value: current.value + added,
    length: current.length + options.tabWidth,
    root: current.root,
  };
};

const makeAlign = (current: Indent, n: number | { type: 'root' }): Indent => {
  // markAsRoot: save the current indent as the root.
  if (typeof n === 'object' && n.type === 'root') {
    return { ...current, root: current };
  }

  // dedentToRoot: reset to root (or column 0).
  if (n === Number.NEGATIVE_INFINITY) {
    return current.root ?? { length: 0, value: '' };
  }

  // dedent: remove the most recent indent/align level.
  if (typeof n === 'number' && n < 0) {
    return {
      value: current.value.slice(0, Math.max(0, current.value.length + n)),
      length: Math.max(0, current.length + n),
      root: current.root,
    };
  }

  // Normal positive alignment.
  return {
    value: current.value + ' '.repeat(n as number),
    length: current.length + (n as number),
    root: current.root,
  };
};

interface Command {
  readonly indent: Indent;
  readonly mode: Mode;
  readonly doc: Doc;
}

/**
 * Simulates flat-mode rendering to check whether a group's contents fit
 * within the remaining line width. Does not produce output — only measures.
 */
const fits = (
  next: Command,
  restCommands: readonly Command[],
  remainingWidth: number,
  hasLineSuffix: boolean,
  groupModeMap: Record<symbol, Mode>
): boolean => {
  if (remainingWidth === Infinity) return true;

  let restIdx = restCommands.length;
  let width = remainingWidth;
  const stack: Array<{ indent?: Indent; mode: Mode; doc: Doc }> = [next];

  while (width >= 0) {
    if (stack.length === 0) {
      // Exhausted the group — peek at parent commands for more context.
      if (restIdx === 0) return true;
      stack.push(restCommands[--restIdx]);
      continue;
    }

    const { indent, mode, doc } = stack.pop()!;

    if (typeof doc === 'string') {
      if (doc) width -= stringWidth(doc);
      continue;
    }

    if (Array.isArray(doc)) {
      for (let i = doc.length - 1; i >= 0; i--) {
        stack.push({ indent, mode, doc: doc[i] });
      }
      continue;
    }

    switch (doc.type) {
      case 'indent':
      case 'align':
      case 'label':
        stack.push({ indent, mode, doc: doc.contents });
        break;

      case 'group': {
        const groupMode = doc.shouldBreak ? MODE_BREAK : mode;
        stack.push({ indent, mode: groupMode, doc: doc.contents });
        break;
      }

      case 'fill':
        for (let i = doc.parts.length - 1; i >= 0; i--) {
          stack.push({ indent, mode, doc: doc.parts[i] });
        }
        break;

      case 'if-break': {
        const groupMode = doc.groupId ? groupModeMap[doc.groupId] ?? MODE_FLAT : mode;
        const contents = groupMode === MODE_BREAK ? doc.breakContents : doc.flatContents;
        if (contents) stack.push({ indent, mode, doc: contents });
        break;
      }

      case 'indent-if-break':
        // In fits() we don't resolve the conditional indent — just measure contents.
        stack.push({ indent, mode, doc: doc.contents });
        break;

      case 'line':
        if (mode === MODE_BREAK || doc.hard) return true; // Line break = fits on this line.
        if (!doc.soft) width -= 1; // space
        break;

      case 'line-suffix':
        hasLineSuffix = true;
        break;

      case 'line-suffix-boundary':
        if (hasLineSuffix) return false;
        break;

      case 'trim':
      case 'cursor':
      case 'break-parent':
        // No width effect.
        break;
    }
  }

  return false;
};

/**
 * Wrapping layout: packs as many items per line as possible, breaking
 * only where needed.
 */
const layoutFill = (
  parts: Doc[],
  indentVal: Indent,
  mode: Mode,
  commands: Command[],
  printWidth: number,
  position: number,
  lineSuffixBuffer: Command[],
  groupModeMap: Record<symbol, Mode>,
  _options: LayoutOptions
): void => {
  const length = parts.length;
  if (length === 0) return;

  const content = parts[0];
  const whitespace = parts[1];

  const contentFlatCmd: Command = { indent: indentVal, mode: MODE_FLAT, doc: content };
  const contentBreakCmd: Command = { indent: indentVal, mode: MODE_BREAK, doc: content };
  const remaining = printWidth - position;
  const hasLS = lineSuffixBuffer.length > 0;

  const contentFits = fits(contentFlatCmd, [], remaining, hasLS, groupModeMap);

  if (length === 1) {
    commands.push(contentFits ? contentFlatCmd : contentBreakCmd);
    return;
  }

  const whitespaceFlatCmd: Command = { indent: indentVal, mode: MODE_FLAT, doc: whitespace };
  const whitespaceBreakCmd: Command = { indent: indentVal, mode: MODE_BREAK, doc: whitespace };

  if (length === 2) {
    commands.push(
      contentFits ? whitespaceFlatCmd : whitespaceBreakCmd,
      contentFits ? contentFlatCmd : contentBreakCmd
    );
    return;
  }

  // Remaining parts (parts[2..])
  const restCmd: Command = {
    indent: indentVal,
    mode,
    doc: { type: 'fill', parts: parts.slice(2) } as FillNode,
  };

  const secondContent = parts[2];
  const bothFitFlat = fits(
    { indent: indentVal, mode: MODE_FLAT, doc: [content, whitespace, secondContent] },
    [],
    remaining,
    hasLS,
    groupModeMap
  );

  // Push in reverse order (stack).
  commands.push(restCmd);

  if (bothFitFlat) {
    commands.push(whitespaceFlatCmd, contentFlatCmd);
  } else if (contentFits) {
    commands.push(whitespaceBreakCmd, contentFlatCmd);
  } else {
    commands.push(whitespaceBreakCmd, contentBreakCmd);
  }
};

/** Sentinel for cursor position tracking. */
const CURSOR_PLACEHOLDER = Symbol.for('cursor');

/**
 * Resolved layout options with all fields required.
 */
interface LayoutOptions {
  /** Maximum line width. */
  readonly printWidth: number;
  /** Number of spaces per indent level. */
  readonly tabWidth: number;
  /** Use tabs instead of spaces. */
  readonly useTabs: boolean;
  /** End-of-line character. */
  readonly endOfLine: string;
}

/**
 * Resolve user-provided options into fully-specified layout options.
 */
const resolveOptions = (opts?: PrettyPrinterOptions): LayoutOptions => ({
  printWidth: opts?.printWidth ?? 80,
  tabWidth: opts?.tabWidth ?? 2,
  useTabs: opts?.useTabs ?? false,
  endOfLine: opts?.endOfLine ?? '\n',
});

/**
 * Returns the visual width of a string. For ASCII-only strings this
 * equals `s.length`. For strings with wide characters (CJK, emoji),
 * a Unicode-aware measurement would be needed.
 *
 * For simplicity, the initial implementation uses `s.length`.
 * A `getStringWidth` utility can be swapped in later if needed.
 */
const stringWidth = (s: string): number => s.length;

// ----------------------------------------------------------------- Public API

/**
 * Options accepted by the public API. All fields are optional with defaults.
 */
export interface PrettyPrinterOptions {
  /**
   * Maximum line width before the engine attempts to break groups.
   * @default 80
   */
  printWidth?: number;

  /**
   * Number of spaces per indentation level.
   * @default 2
   */
  tabWidth?: number;

  /**
   * Use tab characters for indentation instead of spaces.
   * @default false
   */
  useTabs?: boolean;

  /**
   * End-of-line character(s).
   * @default '\n'
   */
  endOfLine?: '\n' | '\r\n' | '\r';
}

/**
 * The layout algorithm. Takes a pretty-print doc tree and options, and produces
 * a concrete string with optimal line breaks.
 */
export const layout = (doc: Doc, opts?: PrettyPrinterOptions): string => {
  const options = resolveOptions(opts);
  const { printWidth, endOfLine } = options;
  const rootIndent: Indent = { length: 0, value: '' };

  // GroupModeMap tracks the resolved mode of named groups for ifBreak.
  const groupModeMap: Record<symbol, Mode> = Object.create(null);

  let output = '';
  let position = 0; // Current column position
  let shouldRemeasure = false;

  // The command stack replaces recursion.
  const commands: Command[] = [{ indent: rootIndent, mode: MODE_BREAK, doc }];

  // lineSuffix buffer: trailing comments deferred until next newline.
  const lineSuffixBuffer: Command[] = [];

  // Pre-pass: propagate hardline/breakParent to ancestor groups.
  propagateBreaks(doc);

  while (commands.length > 0) {
    const cmd = commands.pop()!;
    const { indent: indentVal, mode, doc: currentDoc } = cmd;

    // ── String ──
    if (typeof currentDoc === 'string') {
      if (currentDoc) {
        output += currentDoc;
        position += stringWidth(currentDoc);
      }
      continue;
    }

    // ── Array (concatenation) ──
    if (Array.isArray(currentDoc)) {
      // Push in reverse so the first child is processed first.
      for (let i = currentDoc.length - 1; i >= 0; i--) {
        commands.push({ indent: indentVal, mode, doc: currentDoc[i] });
      }
      continue;
    }

    switch (currentDoc.type) {
      case 'indent':
        commands.push({
          indent: makeIndent(indentVal, options),
          mode,
          doc: currentDoc.contents,
        });
        break;

      case 'align':
        commands.push({
          indent: makeAlign(indentVal, currentDoc.n),
          mode,
          doc: currentDoc.contents,
        });
        break;

      case 'group': {
        if (mode === MODE_FLAT && !shouldRemeasure) {
          // Already in flat mode from a parent group — stay flat
          // unless this group itself forces a break.
          commands.push({
            indent: indentVal,
            mode: currentDoc.shouldBreak ? MODE_BREAK : MODE_FLAT,
            doc: currentDoc.contents,
          });
        } else if (!currentDoc.expandedStates) {
          // Standard group (no alternative states).
          shouldRemeasure = false;
          const groupMode =
            currentDoc.shouldBreak ||
            !fits(
              { indent: indentVal, mode: MODE_FLAT, doc: currentDoc.contents },
              commands,
              printWidth - position,
              lineSuffixBuffer.length > 0,
              groupModeMap
            )
              ? MODE_BREAK
              : MODE_FLAT;

          commands.push({ indent: indentVal, mode: groupMode, doc: currentDoc.contents });

          if (currentDoc.id) {
            groupModeMap[currentDoc.id] = groupMode;
          }
        } else {
          shouldRemeasure = false;
          const remaining = printWidth - position;
          const hasLS = lineSuffixBuffer.length > 0;

          // First, try the base contents in flat mode.
          if (
            fits(
              { indent: indentVal, mode: MODE_FLAT, doc: currentDoc.contents },
              commands,
              remaining,
              hasLS,
              groupModeMap
            )
          ) {
            commands.push({ indent: indentVal, mode: MODE_FLAT, doc: currentDoc.contents });
          } else {
            // Try each expanded state in flat mode.
            let matched = false;
            for (const state of currentDoc.expandedStates) {
              if (state === currentDoc.expandedStates[currentDoc.expandedStates.length - 1]) {
                // Last state — use in break mode (guaranteed fallback).
                commands.push({ indent: indentVal, mode: MODE_BREAK, doc: state });
                matched = true;
                break;
              }
              if (
                fits(
                  { indent: indentVal, mode: MODE_FLAT, doc: state },
                  commands,
                  remaining,
                  hasLS,
                  groupModeMap
                )
              ) {
                commands.push({ indent: indentVal, mode: MODE_FLAT, doc: state });
                matched = true;
                break;
              }
            }
            if (!matched) {
              // Fallback: use base contents in break mode.
              commands.push({ indent: indentVal, mode: MODE_BREAK, doc: currentDoc.contents });
            }
          }

          if (currentDoc.id) {
            // Record mode for ifBreak / indentIfBreak cross-references.
            groupModeMap[currentDoc.id] = commands[commands.length - 1].mode;
          }
        }
        break;
      }

      case 'fill':
        layoutFill(
          currentDoc.parts,
          indentVal,
          mode,
          commands,
          printWidth,
          position,
          lineSuffixBuffer,
          groupModeMap,
          options
        );
        break;

      case 'if-break': {
        const groupMode = currentDoc.groupId ? groupModeMap[currentDoc.groupId] ?? MODE_FLAT : mode;
        const contents =
          groupMode === MODE_BREAK ? currentDoc.breakContents : currentDoc.flatContents;
        if (contents) {
          commands.push({ indent: indentVal, mode, doc: contents });
        }
        break;
      }

      case 'indent-if-break': {
        const refMode = groupModeMap[currentDoc.groupId] ?? MODE_FLAT;
        const shouldApplyIndent = currentDoc.negate
          ? refMode === MODE_FLAT
          : refMode === MODE_BREAK;
        commands.push({
          indent: shouldApplyIndent ? makeIndent(indentVal, options) : indentVal,
          mode,
          doc: currentDoc.contents,
        });
        break;
      }

      case 'cursor':
        // Write a sentinel; record its position for later reporting.
        output += CURSOR_PLACEHOLDER.toString();
        break;

      case 'line-suffix':
        lineSuffixBuffer.push({ indent: indentVal, mode, doc: currentDoc.contents });
        break;

      case 'line-suffix-boundary':
        if (lineSuffixBuffer.length > 0) {
          // Force a newline to flush the suffix buffer.
          commands.push({ indent: indentVal, mode, doc: hardlineWithoutBreakParent });
        }
        break;

      case 'line':
        switch (mode) {
          case MODE_FLAT:
            if (currentDoc.hard) {
              // Hardline in flat mode — forced break. Tell the next group to remeasure.
              shouldRemeasure = true;
              // Fall through to MODE_BREAK handling.
            } else {
              if (!currentDoc.soft) {
                output += ' ';
                position += 1;
              }
              break;
            }
          // falls through (hardline in flat mode)

          case MODE_BREAK:
            // Flush lineSuffix buffer before the newline.
            if (lineSuffixBuffer.length > 0) {
              commands.push({ indent: indentVal, mode, doc: currentDoc });
              commands.push(...lineSuffixBuffer.reverse());
              lineSuffixBuffer.length = 0;
              break;
            }
            if (currentDoc.literal) {
              // literalline: preserve trailing whitespace, indent to root.
              output += endOfLine;
              if (indentVal.root) {
                output += indentVal.root.value;
                position = indentVal.root.length;
              } else {
                position = 0;
              }
            } else {
              // Normal hardline/line/softline: trim trailing spaces, then indent.
              output += endOfLine + indentVal.value;
              position = indentVal.length;
            }
            break;
        }
        break;

      case 'label':
        commands.push({ indent: indentVal, mode, doc: currentDoc.contents });
        break;

      case 'trim': {
        let trimmed = 0;
        while (output.length > 0 && output[output.length - 1] === ' ') {
          output = output.slice(0, -1);
          trimmed++;
        }
        position -= trimmed;
        break;
      }

      case 'break-parent':
        // No-op here — handled by propagateBreaks pre-pass.
        break;
    }

    // Flush remaining lineSuffix at end of document.
    if (commands.length === 0 && lineSuffixBuffer.length > 0) {
      commands.push(...lineSuffixBuffer.reverse());
      lineSuffixBuffer.length = 0;
    }
  }

  return output;
};
