/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as React from 'react';
import { EsqlQuery, Walker } from '@kbn/esql-ast';
import { euiPaletteColorBlind } from '@elastic/eui';
import { Annotation } from '../annotations';

const palette = euiPaletteColorBlind();

const colors = {
  command: palette[2],
  literal: palette[0],
  source: palette[3],
  operator: palette[9],
  column: palette[6],
  function: palette[8],
};

export const highlight = (query: EsqlQuery): Annotation[] => {
  const annotations: Annotation[] = [];

  Walker.walk(query.ast, {
    visitCommand: (node) => {
      const location = node.location;
      if (!location) return;
      const color = node.name === 'from' ? '#07f' : colors.command;
      annotations.push([
        location.min,
        location.min + node.name.length,
        (text) => <span style={{ color, fontWeight: 'bold' }}>{text}</span>,
      ]);
    },

    visitSource: (node) => {
      const location = node.location;
      if (!location) return;
      annotations.push([
        location.min,
        location.max + 1,
        (text) => <span style={{ color: colors.source }}>{text}</span>,
      ]);
    },

    visitColumn: (node) => {
      const location = node.location;
      if (!location) return;
      annotations.push([
        location.min,
        location.max + 1,
        (text) => <span style={{ color: colors.column }}>{text}</span>,
      ]);
    },

    visitFunction: (node) => {
      const location = node.location;
      if (!location) return;
      if (node.subtype === 'variadic-call') {
        annotations.push([
          location.min,
          location.min + node.name.length,
          (text) => <span style={{ color: colors.function }}>{text}</span>,
        ]);
      }
    },

    visitLiteral: (node) => {
      const location = node.location;
      if (!location) return;
      annotations.push([
        location.min,
        location.max + 1,
        (text) => <span style={{ color: colors.literal }}>{text}</span>,
      ]);
    },
  });

  Walker.visitComments(query.ast, (comment) => {
    annotations.push([
      comment.location.min,
      comment.location.max,
      (text) => <span style={{ opacity: 0.3 }}>{text}</span>,
    ]);
  });

  for (const token of query.tokens) {
    switch (token.type) {
      // PIPE
      case 30: {
        const pos = token.start;

        annotations.push([
          pos,
          pos + 1,
          (text) => <span style={{ fontWeight: 'bold', opacity: 0.3 }}>{text}</span>,
        ]);
      }
      default: {
        switch (token.text) {
          case '+':
          case '-':
          case '*':
          case '/':
          case '%':
          case '!=':
          case '>':
          case '>=':
          case '<':
          case '<=':
          case 'AND':
          case 'OR':
          case 'NOT': {
            annotations.push([
              token.start,
              token.start + token.text.length,
              (text) => <span style={{ color: colors.operator }}>{text}</span>,
            ]);
          }
        }
      }
    }
  }

  annotations.sort((a, b) => a[0] - b[0]);

  return annotations;
};
