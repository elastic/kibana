/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type {
  ESQLCommand,
  ESQLMessage,
  ESQLAst,
  ESQLAstRerankCommand,
  ESQLCommandOption,
  ESQLMap,
} from '../../../types';
import type { ICommandContext, ICommandCallbacks } from '../../types';
import { getExpressionType } from '../../../definitions/utils/expressions';
import { validateCommandArguments } from '../../../definitions/utils/validation';
import { isOptionNode, isMap, isLiteral } from '../../../ast/is';

const supportedQueryTypes = ['keyword', 'text', 'param'];
const WITH_OPTION_NAMES = ['inference_id'];

export const validate = (
  command: ESQLCommand,
  ast: ESQLAst,
  context?: ICommandContext,
  callbacks?: ICommandCallbacks
): ESQLMessage[] => {
  const messages: ESQLMessage[] = [];

  const { query, targetField, location } = command as ESQLAstRerankCommand;

  // Sets the target field so the column is recognized after the command is applied
  const targetName = targetField?.name || 'rerank';

  context?.userDefinedColumns.set(targetName, [
    {
      name: targetName,
      location: targetField?.location || location,
      type: 'keyword',
    },
  ]);

  const rerankExpressionType = getExpressionType(
    query,
    context?.fields,
    context?.userDefinedColumns
  );

  // check for supported query types
  if (!supportedQueryTypes.includes(rerankExpressionType)) {
    messages.push({
      location: 'location' in query ? query?.location : location,
      text: i18n.translate('kbn-esql-ast.esql.validation.rerankUnsupportedFieldType', {
        defaultMessage: '[RERANK] query must be of type [text] but is [{rerankExpressionType}]',
        values: { rerankExpressionType },
      }),
      type: 'error',
      code: 'rerankUnsupportedFieldType',
    });
  }

  // check for WITH clause and require inference_id
  const withOption = command.args.find(
    (arg): arg is ESQLCommandOption => isOptionNode(arg) && arg.name === 'with'
  );
  const hasWith = !!withOption || (command.text || '').toLowerCase().includes('with');

  if (hasWith) {
    const map = (withOption?.args?.[0] as ESQLMap | undefined) || undefined;

    const key =
      map && isMap(map) && !map.incomplete
        ? map.entries?.find((entry) => WITH_OPTION_NAMES.includes(entry.key?.valueUnquoted))?.value
        : undefined;

    const isEmptyString = !!(
      key &&
      isLiteral(key) &&
      key.literalType === 'keyword' &&
      (key.valueUnquoted?.length ?? 0) === 0
    );

    if (!key || key.incomplete || isEmptyString) {
      messages.push({
        location: withOption?.location ?? command.location,
        text: i18n.translate('kbn-esql-ast.esql.validation.rerankInferenceIdRequired', {
          defaultMessage: '[RERANK] inference_id parameter is required.',
        }),
        type: 'error',
        code: 'rerankInferenceIdRequired',
      });
    }
  }

  messages.push(...validateCommandArguments(command, ast, context, callbacks));

  return messages;
};
