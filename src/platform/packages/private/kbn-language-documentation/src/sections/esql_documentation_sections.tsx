/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { Markdown } from '@kbn/shared-ux-markdown';

export const initialSection = (
  <Markdown
    readOnly
    enableSoftLineBreaks
    markdownContent={i18n.translate('languageDocumentation.documentationESQL.markdown', {
      defaultMessage: `
An ES|QL (Elasticsearch query language) query consists of a series of commands, separated by pipe characters: \`|\`. Each query starts with a **source command**, which produces a table, typically with data from Elasticsearch.

A source command can be followed by one or more **processing commands**. Processing commands can change the output table of the previous command by adding, removing, and changing rows and columns.

\`\`\` esql
source-command
| processing-command1
| processing-command2
\`\`\`

The result of a query is the table produced by the final processing command.
                                      `,
    })}
  />
);

export { commands as sourceCommands } from './generated/source_commands';
export { commands as processingCommands } from './generated/processing_commands';
export { functions as scalarFunctions } from './generated/scalar_functions';
export { functions as aggregationFunctions } from './generated/aggregation_functions';
export { functions as timeseriesAggregationFunctions } from './generated/timeseries_aggregation_functions';
export { functions as groupingFunctions } from './generated/grouping_functions';
export { functions as operators } from './generated/operators';
