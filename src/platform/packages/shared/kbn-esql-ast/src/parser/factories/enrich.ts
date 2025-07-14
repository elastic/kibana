/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EnrichCommandContext } from '../../antlr/esql_parser';
import { Builder } from '../../builder';
import { ESQLCommand, ESQLSource, ESQLStringLiteral } from '../../types';
import { createCommand, textExistsAndIsValid } from '../factories';
import { getEnrichClauses, getMatchField } from '../walkers';

const visitPolicyName = (ctx: EnrichCommandContext): ESQLSource => {
  const policyNameCtx = ctx._policyName;
  const policyName = policyNameCtx?.ENRICH_POLICY_NAME() || policyNameCtx?.QUOTED_STRING();
  // const policyName = ctx._policyName;

  if (!policyName || !textExistsAndIsValid(policyName.getText())) {
    const source = Builder.expression.source.node(
      {
        sourceType: 'policy',
        name: '',
        index: '',
        prefix: '',
      },
      {
        incomplete: true,
        text: '',
        location: { min: policyNameCtx.start.start, max: policyNameCtx.start.stop },
      }
    );
    return source;
  }

  const name = policyName.getText();
  const colonIndex = name.indexOf(':');
  const withPrefix = colonIndex !== -1;
  const incomplete = false;

  let index: ESQLStringLiteral | undefined;
  let prefix: ESQLStringLiteral | undefined;

  if (withPrefix) {
    const prefixName = name.substring(0, colonIndex);
    const indexName = name.substring(colonIndex + 1);

    prefix = Builder.expression.literal.string(
      prefixName,
      {
        unquoted: true,
      },
      {
        text: prefixName,
        incomplete: false,
        location: {
          min: policyNameCtx.start.start,
          max: policyNameCtx.start.start + prefixName.length - 1,
        },
      }
    );
    index = Builder.expression.literal.string(
      indexName,
      {
        unquoted: true,
      },
      {
        text: indexName,
        incomplete: false,
        location: {
          min: policyNameCtx.start.start + prefixName.length + 1,
          max: policyNameCtx.start.stop,
        },
      }
    );
  } else {
    index = Builder.expression.literal.string(
      name,
      {
        unquoted: true,
      },
      {
        text: name,
        incomplete: false,
        location: { min: policyNameCtx.start.start, max: policyNameCtx.start.stop },
      }
    );
  }

  const source = Builder.expression.source.node(
    {
      sourceType: 'policy',
      name,
      index,
      prefix,
    },
    {
      incomplete,
      text: name,
      location: {
        min: policyNameCtx.start.start,
        max: policyNameCtx.start.stop,
      },
    }
  );

  return source;
};

export const createEnrichCommand = (ctx: EnrichCommandContext): ESQLCommand<'enrich'> => {
  const command = createCommand('enrich', ctx);
  const policy = visitPolicyName(ctx);

  command.args.push(policy);

  if (policy.incomplete) {
    command.incomplete = true;
  }

  command.args.push(...getMatchField(ctx), ...getEnrichClauses(ctx));

  return command;
};
