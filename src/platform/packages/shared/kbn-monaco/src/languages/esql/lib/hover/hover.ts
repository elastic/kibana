/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { parse, Walker } from '@kbn/esql-ast';
import { i18n } from '@kbn/i18n';
import type { AstProviderFn, ESQLAstItem } from '@kbn/esql-ast';
import { Datatable } from '@kbn/expressions-plugin/common';
import {
  getAstContext,
  getFunctionDefinition,
  getFunctionSignatures,
  isSourceItem,
  isSettingItem,
  getCommandDefinition,
  type ESQLCallbacks,
  getPolicyHelper,
  collectVariables,
  ESQLRealField,
} from '@kbn/esql-validation-autocomplete';
import { correctQuerySyntax } from '@kbn/esql-validation-autocomplete/src/shared/helpers';
import type { EditorContext } from '@kbn/esql-validation-autocomplete/src/autocomplete/types';
import {
  getQueryForFields,
  getValidSignaturesAndTypesToSuggestNext,
} from '@kbn/esql-validation-autocomplete/src/autocomplete/helper';
import { buildQueryUntilPreviousCommand } from '@kbn/esql-validation-autocomplete/src/shared/resources_helpers';
import { getFieldsByTypeRetriever } from '@kbn/esql-validation-autocomplete/src/autocomplete/autocomplete';
import {
  TIME_SYSTEM_DESCRIPTIONS,
  TIME_SYSTEM_PARAMS,
} from '@kbn/esql-validation-autocomplete/src/autocomplete/factories';
import { isESQLFunction, isESQLNamedParamLiteral } from '@kbn/esql-ast/src/types';
import { monacoPositionToOffset } from '../shared/utils';
import { monaco } from '../../../../monaco_imports';

const ACCEPTABLE_TYPES_HOVER = i18n.translate('monaco.esql.hover.acceptableTypes', {
  defaultMessage: 'Acceptable types',
});

const getESQLQueryVariables = (esql: string): string[] => {
  const { root } = parse(esql);
  const usedVariablesInQuery = Walker.params(root);
  return usedVariablesInQuery.map((v) => v.text.replace('?', ''));
};

const reorderColumns = (table: Datatable, columnName: string) => {
  if (!table.columns || !Array.isArray(table.columns)) {
    return table;
  }

  // Find the specified column
  const targetColumn = table.columns.find((col) => col.id === columnName);
  if (!targetColumn) {
    return table;
  }

  // Filter out the target column and re-add it at the beginning
  table.columns = [targetColumn, ...table.columns.filter((col) => col.id !== columnName)];

  // Reorder the row keys to match the new column order
  table.rows = table.rows.map((row) => {
    const reorderedRow = { [columnName]: row[columnName] };
    for (const col of table.columns) {
      if (col.id !== columnName) {
        reorderedRow[col.id] = row[col.id];
      }
    }
    return reorderedRow;
  });

  return table;
};

const generateMarkdownColumnsList = (table: Datatable, columnsPerRow = 5) => {
  const firstRow = table.rows[0];

  const columns = table.columns.map((col) => {
    const previewValue = firstRow[col.id] !== undefined ? firstRow[col.id] : 'N/A';
    return `**${col.name}** (${col.meta.type}) - Preview: ${previewValue}`;
  });

  // Generate Markdown table
  let markdown = '| ' + columns.slice(0, columnsPerRow).join(' | ') + ' |\n'; // Header row
  markdown +=
    '| ' + Array(Math.min(columns.length, columnsPerRow)).fill('---').join(' | ') + ' |\n'; // Separator row

  for (let i = columnsPerRow; i < columns.length; i += columnsPerRow) {
    markdown += '| ' + columns.slice(i, i + columnsPerRow).join(' | ') + ' |\n'; // Data rows
  }

  return markdown;
};

const createMarkdownTable = (table: Datatable) => {
  // Remove empty columns
  const nonEmptyColumns = table.columns.filter((col) =>
    table.rows.some((row) => row[col.name] !== undefined && row[col.name] !== '')
  );

  const headers = nonEmptyColumns.map((col) => col.name);

  // Remove empty rows
  const filteredRows = table.rows.filter((row) =>
    headers.some((header) => row[header] !== undefined && row[header] !== '')
  );

  if (headers.length === 0 || filteredRows.length === 0) {
    return undefined;
  }

  // Determine max column widths with extra padding for readability
  const columnWidths = headers.map(
    (header) =>
      Math.max(header.length, ...filteredRows.map((row) => String(row[header] || '').length)) + 2
  );

  // Create markdown table header
  let markdown = `| ${headers
    .map((header, i) => `**${header}**`.padEnd(columnWidths[i]))
    .join(' | ')} |
`;
  markdown += `| ${columnWidths.map((width) => '-'.repeat(width)).join(' | ')} |
`;

  // Populate rows
  filteredRows.forEach((row) => {
    const rowValues = headers.map((header, i) => String(row[header] || '').padEnd(columnWidths[i]));
    markdown += `| ${rowValues.join(' | ')} |
`;
  });

  return markdown;
};

const createMarkdown = (table: Datatable) => {
  if (!table || !table.columns || !table.rows || !Array.isArray(table.columns)) {
    return undefined;
  }
  const columnsCount = table.columns.length;

  if (columnsCount >= 10) {
    return generateMarkdownColumnsList(table);
  }
  return createMarkdownTable(table);
};

async function getHoverItemForFunction(
  model: monaco.editor.ITextModel,
  position: monaco.Position,
  token: monaco.CancellationToken,
  astProvider: AstProviderFn,
  resourceRetriever?: ESQLCallbacks
) {
  const context: EditorContext = {
    triggerCharacter: ' ',
    triggerKind: 1,
  };

  const fullText = model.getValue();
  const offset = monacoPositionToOffset(fullText, position);
  const innerText = fullText.substring(0, offset);

  const correctedQuery = correctQuerySyntax(innerText, context);
  const { ast } = await astProvider(correctedQuery);
  const astContext = getAstContext(innerText, ast, offset);

  const { node } = astContext;
  const commands = ast;

  if (isESQLFunction(node) && astContext.type === 'function') {
    const queryForFields = getQueryForFields(
      buildQueryUntilPreviousCommand(ast, correctedQuery),
      ast
    );
    const { getFieldsMap } = getFieldsByTypeRetriever(queryForFields, resourceRetriever);

    const fnDefinition = getFunctionDefinition(node.name);
    // early exit on no hit
    if (!fnDefinition) {
      return undefined;
    }
    const fieldsMap: Map<string, ESQLRealField> = await getFieldsMap();
    const anyVariables = collectVariables(commands, fieldsMap, innerText);

    const references = {
      fields: fieldsMap,
      variables: anyVariables,
    };

    const { typesToSuggestNext, enrichedArgs } = getValidSignaturesAndTypesToSuggestNext(
      node,
      references,
      fnDefinition,
      fullText,
      offset
    );

    const hoveredArg: ESQLAstItem & {
      dataType: string;
    } = enrichedArgs[enrichedArgs.length - 1];
    const contents = [];
    if (hoveredArg && isESQLNamedParamLiteral(hoveredArg)) {
      const bestMatch = TIME_SYSTEM_PARAMS.find((p) => p.startsWith(hoveredArg.text));
      // We only know if it's start or end after first 3 characters (?t_s or ?t_e)
      if (hoveredArg.text.length > 3 && bestMatch) {
        Object.entries(TIME_SYSTEM_DESCRIPTIONS).forEach(([key, value]) => {
          contents.push({
            value: `**${key}**: ${value}`,
          });
        });
      }
    }

    if (typesToSuggestNext.length > 0) {
      contents.push({
        value: `**${ACCEPTABLE_TYPES_HOVER}**: ${typesToSuggestNext
          .map(
            ({ type, constantOnly }) =>
              `${constantOnly ? '_constant_ ' : ''}**${type}**` +
              // If function arg is a constant date, helpfully suggest named time system params
              (constantOnly && type === 'date' ? ` | ${TIME_SYSTEM_PARAMS.join(' | ')}` : '')
          )
          .join(' | ')}`,
      });
    }
    const hints =
      contents.length > 0
        ? {
            range: new monaco.Range(
              1,
              1,
              model.getLineCount(),
              model.getLineMaxColumn(model.getLineCount())
            ),
            contents,
          }
        : undefined;
    return hints;
  }
}

export async function getHoverItem(
  model: monaco.editor.ITextModel,
  position: monaco.Position,
  token: monaco.CancellationToken,
  astProvider: AstProviderFn,
  resourceRetriever?: ESQLCallbacks
) {
  const fullText = model.getValue();
  const offset = monacoPositionToOffset(fullText, position);
  const innerText = fullText.substring(0, offset);
  const { ast } = await astProvider(fullText);
  const astContext = getAstContext(fullText, ast, offset);

  const currentPipeIndex = innerText.split('|').length;
  const validQueryOnCurrentPipe = fullText.split('|').slice(0, currentPipeIndex).join('|');
  let previewTable = await resourceRetriever?.getHoverData?.({ query: validQueryOnCurrentPipe });

  const variables = resourceRetriever?.getESQLVariables?.();
  const usedVariablesInQuery = getESQLQueryVariables(fullText);
  const usedVariables = variables?.filter((v) => usedVariablesInQuery.includes(v.key));

  const { getPolicyMetadata } = getPolicyHelper(resourceRetriever);

  const hoverContent: monaco.languages.Hover = {
    contents: [],
  };

  if (usedVariables?.length) {
    usedVariables.forEach((variable) => {
      if (validQueryOnCurrentPipe.includes(`?${variable.key}`)) {
        hoverContent.contents.push({
          value: `**${variable.key}**: ${variable.value}`,
        });
      }
    });
  }

  const hoverItemsForFunction = await getHoverItemForFunction(
    model,
    position,
    token,
    astProvider,
    resourceRetriever
  );
  if (hoverItemsForFunction) {
    hoverContent.contents.push(...hoverItemsForFunction.contents);
    hoverContent.range = hoverItemsForFunction.range;
  }

  if (['newCommand', 'list'].includes(astContext.type)) {
    const markdownTable = previewTable ? createMarkdown(previewTable) : '';
    if (markdownTable) {
      const markdownHoverContent = [
        { value: `### Preview of the columns at this pipe` },
        { value: markdownTable },
      ];
      return { contents: markdownHoverContent };
    }
    return { contents: [] };
  }

  if (astContext.type === 'function') {
    const fnDefinition = getFunctionDefinition(astContext.node.name);

    if (fnDefinition) {
      hoverContent.contents.push(
        ...[
          { value: getFunctionSignatures(fnDefinition)[0].declaration },
          { value: fnDefinition.description },
        ]
      );
    }
  }

  if (astContext.type === 'expression') {
    if (astContext.node) {
      const columnName = astContext.node.name;
      if (columnName && previewTable?.columns) {
        const column = previewTable.columns.find((col) => col.name === columnName);
        if (column) {
          hoverContent.contents.push(
            ...[
              {
                value: `**${columnName}** -- Type: ${column.meta.type}`,
              },
            ]
          );
        }
        previewTable = reorderColumns(previewTable, columnName);
      }
      if (isSourceItem(astContext.node) && astContext.node.sourceType === 'policy') {
        const policyMetadata = await getPolicyMetadata(astContext.node.name);
        if (policyMetadata) {
          hoverContent.contents.push(
            ...[
              {
                value: `${i18n.translate('monaco.esql.hover.policyIndexes', {
                  defaultMessage: '**Indexes**',
                })}: ${policyMetadata.sourceIndices.join(', ')}`,
              },
              {
                value: `${i18n.translate('monaco.esql.hover.policyMatchingField', {
                  defaultMessage: '**Matching field**',
                })}: ${policyMetadata.matchField}`,
              },
              {
                value: `${i18n.translate('monaco.esql.hover.policyEnrichedFields', {
                  defaultMessage: '**Fields**',
                })}: ${policyMetadata.enrichFields.join(', ')}`,
              },
            ]
          );
        }
      }
      if (isSettingItem(astContext.node)) {
        const commandDef = getCommandDefinition(astContext.command.name);
        const settingDef = commandDef?.modes.find(({ values }) =>
          values.some(({ name }) => name === astContext.node!.name)
        );
        if (settingDef) {
          const mode = settingDef.values.find(({ name }) => name === astContext.node!.name)!;
          hoverContent.contents.push(
            ...[
              { value: settingDef.description },
              {
                value: `**${mode.name}**: ${mode.description}`,
              },
            ]
          );
        }
      }
    }
  }
  const markdownTable = previewTable ? createMarkdown(previewTable) : '';
  if (markdownTable) {
    const markdownHoverContent = [
      { value: `### Preview of the columns at this pipe` },
      { value: markdownTable },
    ];
    hoverContent.contents.push(...markdownHoverContent);
  }
  return hoverContent;
}
