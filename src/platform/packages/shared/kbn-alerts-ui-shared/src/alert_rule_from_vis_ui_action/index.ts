/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { TypeRegistry } from '../common/type_registry';
import { ActionTypeModel, Rule, RuleTypeModel } from '../common';

export interface AlertRuleFromVisUIActionData {
  timeField: string;
  query: string | null;
  thresholdValues: Record<string, number>;
  splitValues: Record<string, Array<string | number | null | undefined>>;
}

export const getAlertRuleFromVisUiAction =
  (
    ruleTypeRegistry: TypeRegistry<RuleTypeModel>,
    actionTypeRegistry: TypeRegistry<ActionTypeModel>
  ) =>
  async () => ({
    type: 'alertRule',
    id: 'alertRule',
    shouldAutoExecute: async () => true,
    execute: async (context: {
      data: AlertRuleFromVisUIActionData;
      embeddable: {
        createAlertRule: (
          initialValues: Partial<Rule>,
          ruleTypeRegistry: TypeRegistry<RuleTypeModel>,
          actionTypeRegistry: TypeRegistry<ActionTypeModel>
        ) => void;
      };
    }) => {
      const { timeField, query, thresholdValues, splitValues } = context.data;

      let evalQuery = '';
      const evaluateFieldName = (fieldName: string) => {
        // Detect if the passed column name is actually an ES|QL function call instead of a field name
        const esqlFunctionRegex = /[A-Z]+\(.*?\)/;
        if (esqlFunctionRegex.test(fieldName)) {
          // Convert the function to a lowercase, snake_cased variable
          // e.g. FUNCTION(arg1, arg2) -> _function_arg1_arg2
          const colName = `_${fieldName
            .toLowerCase()
            .replace(/[\),*]/g, '') // Eliminate parens, asterisks, commas
            .replace(/[\( ]/g, '_')}`; // Replace opening paren and spaces with underscores
          // Add this to the evalQuery as a side effect
          evalQuery += `| EVAL ${colName} = \`${fieldName}\` `;
          return colName;
        }
        return fieldName;
      };

      const thresholdQuery = Object.entries(thresholdValues)
        .map(([sourceField, value]) => `${evaluateFieldName(sourceField)} >= ${value}`)
        .join(' AND ');
      const thresholdQueryComment = i18n.translate(
        'alertsUIShared.alertRuleFromVis.thresholdComment',
        {
          defaultMessage:
            'Threshold automatically generated from the selected {thresholdValues, plural, one {value} other {values} } on the chart. This rule will generate an alert based on the following conditions:',
          values: { thresholdValues: thresholdValues.length },
        }
      );

      const splitValueQueries = Object.entries(splitValues).map(([fieldName, values]) =>
        values.length === 1
          ? `${fieldName} == "${values[0]}"`
          : `(${values
              .map((v) =>
                v ? `${evaluateFieldName(fieldName)} == ${typeof v === 'number' ? v : '${v}'}` : ''
              )
              .filter(Boolean)
              .join(' OR ')})`
      );
      const conditionsQuery = [...splitValueQueries, thresholdQuery].join(' AND ');

      if (evalQuery.length)
        evalQuery = `// ${i18n.translate('alertsUIShared.alertRuleFromVis.evalComment', {
          defaultMessage:
            'Evaluating the following columns so they can be used as part of the alerting threshold:',
        })}\n${evalQuery}\n`;

      const queryHeader = i18n.translate('alertsUIShared.alertRuleFromVis.queryHeaderComment', {
        defaultMessage: 'Original ES|QL query derived from the visualization:',
      });

      const initialValues = {
        params: {
          searchType: 'esqlQuery',
          esqlQuery: {
            esql: `// ${queryHeader}\n${query}\n${evalQuery}// ${thresholdQueryComment}\n| WHERE ${conditionsQuery}`,
          },
          timeField,
        },
      };

      context.embeddable.createAlertRule(initialValues, ruleTypeRegistry, actionTypeRegistry);
    },
  });
