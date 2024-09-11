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
  source: palette[3],
};

export const highlight = (query: EsqlQuery): Annotation[] => {
  const annotations: Annotation[] = [];

  Walker.walk(query.ast, {
    visitCommand: (node) => {
      const location = node.location;
      if (!location) return;
      annotations.push([
        location.min,
        location.min + node.name.length,
        (text) => <span style={{ color: colors.command }}>{text}</span>,
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
    }
  }

  annotations.sort((a, b) => a[0] - b[0]);

  return annotations;
};
