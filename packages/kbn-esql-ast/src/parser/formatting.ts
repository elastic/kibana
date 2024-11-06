/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type CommonTokenStream, Token } from 'antlr4';
import { Builder } from '../builder';
import { Visitor } from '../visitor';
import type {
  ESQLAstComment,
  ESQLAstCommentMultiLine,
  ESQLAstCommentSingleLine,
  ESQLAstNodeFormatting,
  ESQLAstQueryExpression,
  ESQLProperNode,
} from '../types';
import type {
  ParsedFormattingCommentDecoration,
  ParsedFormattingDecoration,
  ParsedFormattingDecorationLines,
} from './types';
import { HIDDEN_CHANNEL } from './constants';
import { findVisibleToken, isLikelyPunctuation } from './helpers';

const commentSubtype = (text: string): ESQLAstComment['subtype'] | undefined => {
  if (text[0] === '/') {
    if (text[1] === '/') {
      return 'single-line';
    }
    if (text[1] === '*') {
      const end = text.length - 1;
      if (text[end] === '/' && text[end - 1] === '*') {
        return 'multi-line';
      }
    }
  }
};

const trimRightNewline = (text: string): string => {
  const last = text.length - 1;
  if (text[last] === '\n') {
    return text.slice(0, last);
  }
  return text;
};

/**
 * Collects *decorations* (all comments and whitespace of interest) from the
 * token stream.
 *
 * @param tokens Lexer token stream
 * @returns List of comments found in the token stream
 */
export const collectDecorations = (
  tokens: CommonTokenStream
): { comments: ESQLAstComment[]; lines: ParsedFormattingDecorationLines } => {
  const comments: ESQLAstComment[] = [];
  const list = tokens.tokens;
  const length = list.length;
  const lines: ParsedFormattingDecorationLines = [];

  let line: ParsedFormattingDecoration[] = [];
  let pos = 0;
  let hasContentToLeft = false;

  // The last token in <EOF> token, which we don't need to process.
  for (let i = 0; i < length - 1; i++) {
    const token = list[i];
    const { channel, text } = token;
    const min = pos;
    const max = min + text.length;

    pos = max;

    const isContentToken = channel !== HIDDEN_CHANNEL;

    if (isContentToken) {
      const isPunctuation = isLikelyPunctuation(text);

      if (!isPunctuation) {
        hasContentToLeft = true;
        for (const decoration of line) {
          if (decoration.type === 'comment') {
            decoration.hasContentToRight = true;
          }
        }
        continue;
      }
    }

    const subtype = commentSubtype(text);
    const isComment = !!subtype;

    if (!isComment) {
      const hasLineBreak = text.lastIndexOf('\n') !== -1;

      if (hasLineBreak) {
        lines.push(line);
        line = [];
        hasContentToLeft = false;
      }
      continue;
    }

    const cleanText =
      subtype === 'single-line' ? trimRightNewline(text.slice(2)) : text.slice(2, -2);
    const node = Builder.comment(subtype, cleanText, { min, max });
    const comment: ParsedFormattingCommentDecoration = {
      type: 'comment',
      hasContentToLeft,
      hasContentToRight: false,
      node,
    };

    comments.push(comment.node);
    line.push(comment);

    if (subtype === 'single-line') {
      const hasLineBreak = text[text.length - 1] === '\n';

      if (hasLineBreak) {
        lines.push(line);
        line = [];
        hasContentToLeft = false;
      }
    }
  }

  if (line.length > 0) {
    lines.push(line);
  }

  return { comments, lines };
};

const attachTopComment = (node: ESQLProperNode, comment: ESQLAstComment) => {
  const formatting: ESQLAstNodeFormatting = node.formatting || (node.formatting = {});
  const list = formatting.top || (formatting.top = []);
  list.push(comment);
};

const attachBottomComment = (node: ESQLProperNode, comment: ESQLAstComment) => {
  const formatting: ESQLAstNodeFormatting = node.formatting || (node.formatting = {});
  const list = formatting.bottom || (formatting.bottom = []);
  list.push(comment);
};

const attachLeftComment = (node: ESQLProperNode, comment: ESQLAstCommentMultiLine) => {
  const formatting: ESQLAstNodeFormatting = node.formatting || (node.formatting = {});
  const list = formatting.left || (formatting.left = []);
  list.push(comment);
};

const attachRightComment = (node: ESQLProperNode, comment: ESQLAstCommentMultiLine) => {
  const formatting: ESQLAstNodeFormatting = node.formatting || (node.formatting = {});
  const list = formatting.right || (formatting.right = []);
  list.push(comment);
};

const attachRightEndComment = (node: ESQLProperNode, comment: ESQLAstCommentSingleLine) => {
  const formatting: ESQLAstNodeFormatting = node.formatting || (node.formatting = {});
  formatting.rightSingleLine = comment;
};

const attachCommentDecoration = (
  ast: ESQLAstQueryExpression,
  tokens: Token[],
  comment: ParsedFormattingCommentDecoration
) => {
  const commentConsumesWholeLine = !comment.hasContentToLeft && !comment.hasContentToRight;

  if (commentConsumesWholeLine) {
    const node = Visitor.findNodeAtOrAfter(ast, comment.node.location.max - 1);

    if (!node) {
      // No node after the comment found, it is probably at the end of the file.
      // So we attach it to the last command from the "bottom".
      const commands = ast.commands;
      const lastCommand = commands[commands.length - 1];
      if (lastCommand) {
        attachBottomComment(lastCommand, comment.node);
      }
      return;
    }

    attachTopComment(node, comment.node);
    return;
  }

  if (comment.hasContentToRight && comment.node.subtype === 'multi-line') {
    const nodeToRight = Visitor.findNodeAtOrAfter(ast, comment.node.location.max - 1);

    if (!nodeToRight) {
      const nodeToLeft = Visitor.findNodeAtOrBefore(ast, comment.node.location.min);

      if (nodeToLeft) {
        attachRightComment(nodeToLeft, comment.node);
      }

      return;
    }

    const isInsideNode = nodeToRight.location.min <= comment.node.location.min;

    if (isInsideNode) {
      attachLeftComment(nodeToRight, comment.node);
      return;
    }

    const visibleTokenBetweenCommentAndNodeToRight = findVisibleToken(
      tokens,
      comment.node.location.max,
      nodeToRight.location.min - 1
    );

    if (visibleTokenBetweenCommentAndNodeToRight) {
      const nodeToLeft = Visitor.findNodeAtOrBefore(ast, comment.node.location.min);

      if (nodeToLeft) {
        attachRightComment(nodeToLeft, comment.node);
        return;
      }
    }

    attachLeftComment(nodeToRight, comment.node);
    return;
  }

  if (comment.hasContentToLeft) {
    const node = Visitor.findNodeAtOrBefore(ast, comment.node.location.min);

    if (!node) return;

    if (comment.node.subtype === 'multi-line') {
      attachRightComment(node, comment.node);
    } else if (comment.node.subtype === 'single-line') {
      attachRightEndComment(node, comment.node);
    }

    return;
  }
};

/**
 * Walks through the AST and - for each decoration - attaches it to the
 * appropriate AST node, which is determined by the layout of the source text.
 *
 * @param ast AST to attach comments to.
 * @param comments List of comments to attach to the AST.
 */
export const attachDecorations = (
  ast: ESQLAstQueryExpression,
  tokens: Token[],
  lines: ParsedFormattingDecorationLines
) => {
  for (const line of lines) {
    for (const decoration of line) {
      switch (decoration.type) {
        case 'comment': {
          attachCommentDecoration(ast, tokens, decoration);
          break;
        }
      }
    }
  }
};
