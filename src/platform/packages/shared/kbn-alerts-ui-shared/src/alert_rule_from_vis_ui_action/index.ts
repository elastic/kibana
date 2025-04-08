/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { Action } from '@kbn/ui-actions-plugin/public';
import { ALERT_RULE_TRIGGER } from '@kbn/ui-actions-browser/src/triggers';
import { hasBlockingError } from '@kbn/presentation-publishing';
import type { LensApi } from '@kbn/lens-plugin/public';
import type { TextBasedPersistedState } from '@kbn/lens-plugin/public/datasources/text_based/types';
import type { Datatable } from '@kbn/expressions-plugin/common';
import type { ActionTypeModel, RuleTypeModel } from '../common';
import type { TypeRegistry } from '../common/type_registry';

export interface AlertRuleFromVisUIActionData {
  timeField: string;
  query: string | null;
  thresholdValues: Record<string, number>;
  splitValues: Record<string, Array<string | number | null | undefined>>;
  usesPlaceholderValues?: boolean;
}

interface Context {
  data?: AlertRuleFromVisUIActionData;
  embeddable: LensApi;
}

export class AlertRuleFromVisAction implements Action<Context> {
  private ruleTypeRegistry: TypeRegistry<RuleTypeModel>;
  private actionTypeRegistry: TypeRegistry<ActionTypeModel>;

  public type = ALERT_RULE_TRIGGER;
  public id = ALERT_RULE_TRIGGER;

  constructor(
    ruleTypeRegistry: TypeRegistry<RuleTypeModel>,
    actionTypeRegistry: TypeRegistry<ActionTypeModel>
  ) {
    this.ruleTypeRegistry = ruleTypeRegistry;
    this.actionTypeRegistry = actionTypeRegistry;
  }

  public getIconType = () => 'bell';

  public async isCompatible({ embeddable }: Context) {
    const { isLensApi } = await import('@kbn/lens-plugin/public');
    if (!isLensApi(embeddable) || hasBlockingError(embeddable)) return false;

    const query = embeddable.query$.getValue();
    return Boolean(query && 'esql' in query);
  }

  public getDisplayName = () =>
    i18n.translate('alertsUIShared.alertRuleFromVis.actionName', {
      defaultMessage: 'Add alert rule',
    });

  public shouldAutoExecute = async () => true;

  public async execute({ embeddable, data }: Context) {
    const { timeField, query, thresholdValues, splitValues, usesPlaceholderValues } =
      data ?? getDataFromEmbeddable(embeddable);

    let initialValues;
    if (query) {
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
      const thresholdQueryComment = usesPlaceholderValues
        ? i18n.translate('alertsUIShared.alertRuleFromVis.thresholdPlaceholderComment', {
            defaultMessage:
              'Modify the following conditions to set an alert threshold for this rule:',
          })
        : i18n.translate('alertsUIShared.alertRuleFromVis.thresholdComment', {
            defaultMessage:
              'Threshold automatically generated from the selected {thresholdValues, plural, one {value} other {values} } on the chart. This rule will generate an alert based on the following conditions:',
            values: { thresholdValues: thresholdValues.length },
          });

      const splitValueQueries = Object.entries(splitValues).map(([fieldName, values]) =>
        values.length === 1
          ? `${fieldName} == "${values[0]}"`
          : `(${values
              .map((v) =>
                v
                  ? `${evaluateFieldName(fieldName)} == ${typeof v === 'number' ? v : `"${v}"`}`
                  : ''
              )
              .filter(Boolean)
              .join(' OR ')})`
      );
      const conditionsQuery = [...splitValueQueries, thresholdQuery].join(' AND ');

      if (evalQuery.length)
        evalQuery = `// ${i18n.translate('alertsUIShared.alertRuleFromVis.evalComment', {
          defaultMessage:
            'Evaluate the following columns so they can be used as part of the alerting threshold:',
        })}\n${evalQuery}\n`;

      const queryHeader = i18n.translate('alertsUIShared.alertRuleFromVis.queryHeaderComment', {
        defaultMessage: 'Original ES|QL query derived from the visualization:',
      });

      initialValues = {
        params: {
          searchType: 'esqlQuery',
          esqlQuery: {
            esql: `// ${queryHeader}\n${query}\n${evalQuery}// ${thresholdQueryComment}\n| WHERE ${conditionsQuery}`,
          },
          timeField,
        },
      };
    } else {
      initialValues = {
        params: {
          searchType: 'esqlQuery',
          esqlQuery: {
            esql: `// ${i18n.translate('alertsUIShared.alertRuleFromVis.missingQueryComment', {
              defaultMessage: 'Unable to generate an ES|QL query from the visualization.',
            })}`,
          },
          timeField,
        },
      };
    }

    embeddable.createAlertRule(initialValues, this.ruleTypeRegistry, this.actionTypeRegistry);
  }
}

const getDataFromEmbeddable = (embeddable: Context['embeddable']) => {
  const queryValue = embeddable.query$.getValue();
  const query = queryValue && 'esql' in queryValue ? queryValue.esql : null;
  const { state } = embeddable.serializeState().rawState.attributes ?? {};
  const layers = (state?.datasourceStates?.textBased as TextBasedPersistedState | undefined)
    ?.layers;
  const [firstLayer] = Object.values(layers ?? {});
  const { timeField = 'timestamp' } = firstLayer;

  const datatable = Object.values(
    embeddable.getInspectorAdapters().tables.tables ?? {}
  )[0] as unknown as Datatable | undefined;

  const thresholdValues = datatable
    ? datatable.columns
        .filter((col) => col.meta.dimensionName === 'Vertical axis')
        .reduce((result, { meta }) => {
          const { sourceField } = meta.sourceParams ?? {
            sourceField: i18n.translate('alertsUIShared.alertRuleFromVis.fieldNamePlaceholder', {
              defaultMessage: '{FIELD NAME}',
            }),
          };
          return {
            ...result,
            [String(sourceField)]: i18n.translate(
              'alertsUIShared.alertRuleFromVis.thresholdPlaceholder',
              {
                defaultMessage: '{THRESHOLD}',
              }
            ),
          };
        }, {})
    : {};

  const xColumns = datatable?.columns.filter((col) => col.meta.dimensionName === 'Horizontal axis');
  const isTimeViz = xColumns?.some(({ meta }) => meta.type === 'date');
  const splitValues =
    isTimeViz || !xColumns
      ? {}
      : xColumns.reduce((result, { meta }) => {
          const { sourceField } = meta.sourceParams ?? {
            sourceField: i18n.translate('alertsUIShared.alertRuleFromVis.fieldNamePlaceholder', {
              defaultMessage: '{FIELD NAME}',
            }),
          };
          return {
            ...result,
            [String(sourceField)]: [
              i18n.translate('alertsUIShared.alertRuleFromVis.splitValuePlaceholder', {
                defaultMessage: '{VALUE}',
              }),
            ],
          };
        }, {});

  return {
    query,
    timeField,
    splitValues,
    thresholdValues,
    usesPlaceholderValues: true,
  } as AlertRuleFromVisUIActionData;
};
