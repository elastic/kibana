/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { pick } from 'lodash';
import { i18n } from '@kbn/i18n';
import type { Action } from '@kbn/ui-actions-plugin/public';
import { ALERT_RULE_TRIGGER } from '@kbn/ui-actions-browser/src/triggers';
import { apiIsOfType, hasBlockingError } from '@kbn/presentation-publishing';
import type { LensApi } from '@kbn/lens-plugin/public';
import type { TextBasedPersistedState } from '@kbn/lens-plugin/public/datasources/text_based/types';
import type { Datatable } from '@kbn/expressions-plugin/common';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { ActionTypeRegistryContract, RuleTypeRegistryContract } from '../common';

export interface AlertRuleFromVisUIActionData {
  timeField: string;
  query: string | null;
  thresholdValues: Record<string, number>;
  splitValues: Record<string, Array<string | number | null | undefined>>;
  usesPlaceholderValues?: boolean;
  dataView?: DataView;
}

interface Context {
  data?: AlertRuleFromVisUIActionData;
  embeddable: LensApi;
}

export class AlertRuleFromVisAction implements Action<Context> {
  private ruleTypeRegistry: RuleTypeRegistryContract;
  private actionTypeRegistry: ActionTypeRegistryContract;

  public type = ALERT_RULE_TRIGGER;
  public id = ALERT_RULE_TRIGGER;

  constructor(
    ruleTypeRegistry: RuleTypeRegistryContract,
    actionTypeRegistry: ActionTypeRegistryContract
  ) {
    this.ruleTypeRegistry = ruleTypeRegistry;
    this.actionTypeRegistry = actionTypeRegistry;
  }

  public getIconType = () => 'bell';

  public async isCompatible({ embeddable }: Context) {
    const isLensApi = apiIsOfType(embeddable, 'lens');
    if (!isLensApi || hasBlockingError(embeddable)) return false;
    const query = embeddable.query$.getValue();
    return Boolean(query && 'esql' in query);
  }

  public getDisplayName = () =>
    i18n.translate('alertsUIShared.alertRuleFromVis.actionName', {
      defaultMessage: 'Add alert rule',
    });

  public shouldAutoExecute = async () => true;

  public async execute({ embeddable, data }: Context) {
    const { timeField, query, thresholdValues, splitValues, usesPlaceholderValues, dataView } =
      data?.query
        ? data
        : data
        ? {
            ...data,
            ...pick(getDataFromEmbeddable(embeddable), [
              'query',
              'dataView',
              'usesPlaceholderValues',
            ]),
          }
        : getDataFromEmbeddable(embeddable);

    // Set up a helper function to evaluate field names that need to be escaped
    let evalQuery = '';
    const escapeFieldName = (fieldName: string) => {
      if (!fieldName || fieldName === 'undefined') return missingSourceFieldPlaceholder;
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

    // Generate an addition to the query that sets an alert threshold
    const thresholdQuery = Object.entries(thresholdValues)
      .map(([sourceField, value]) => `${escapeFieldName(sourceField)} >= ${value}`)
      .join(' AND ');
    const thresholdQueryComment = usesPlaceholderValues
      ? i18n.translate('alertsUIShared.alertRuleFromVis.thresholdPlaceholderComment', {
          defaultMessage:
            'Modify the following conditions to set an alert threshold for this rule:',
        })
      : i18n.translate('alertsUIShared.alertRuleFromVis.thresholdComment', {
          defaultMessage:
            'Threshold automatically generated from the selected {thresholdValues, plural, one {value} other {values} } on the chart. This rule will generate an alert based on the following conditions:',
          values: { thresholdValues: Object.keys(thresholdValues).length },
        });

    const splitValueQueries = Object.entries(splitValues).map(([fieldName, values]) => {
      const queries = `${values
        .map((v) =>
          v ? `${escapeFieldName(fieldName)} == ${typeof v === 'number' ? v : `"${v}"`}` : ''
        )
        .filter(Boolean)
        .join(' OR ')}`;
      return values.length === 1 ? queries : `(${queries})`;
    });
    const conditionsQuery = [...splitValueQueries, thresholdQuery].join(' AND ');

    // Generate ES|QL to escape function columns
    if (evalQuery.length)
      evalQuery = `// ${i18n.translate('alertsUIShared.alertRuleFromVis.evalComment', {
        defaultMessage:
          'Evaluate the following columns so they can be used as part of the alerting threshold:',
      })}\n${evalQuery}\n`;

    // Combine the escaped columns with the threshold conditions query
    const additionalQuery = `${evalQuery}// ${thresholdQueryComment}\n| WHERE ${conditionsQuery}`;

    // Generate the full ES|QL code
    let initialValues;
    if (query) {
      const queryHeader = i18n.translate('alertsUIShared.alertRuleFromVis.queryHeaderComment', {
        defaultMessage: 'Original ES|QL query derived from the visualization:',
      });

      initialValues = {
        params: {
          searchType: 'esqlQuery',
          esqlQuery: {
            esql: `// ${queryHeader}\n${query}\n${additionalQuery}`,
          },
          timeField,
        },
      };
    } else {
      const missingQueryComment = `// ${i18n.translate(
        'alertsUIShared.alertRuleFromVis.missingQueryComment',
        {
          defaultMessage: 'Unable to generate an ES|QL query from the visualization.',
        }
      )}`;
      let esql = missingQueryComment;

      if (dataView) {
        const [index] = dataView.matchedIndices;
        const esqlFromDataviewComment = `// ${i18n.translate(
          'alertsUIShared.alertRuleFromVis.esqlFromDataviewComment',
          {
            defaultMessage:
              'Unable to automatically generate an ES|QL query that produces the same data as this visualization. You may be able to reproduce it manually using this data source:',
          }
        )}`;
        const dataViewQuery = `FROM ${index}`;
        esql = `${esqlFromDataviewComment}\n${dataViewQuery}\n${additionalQuery}`;
      }
      initialValues = {
        params: {
          searchType: 'esqlQuery',
          esqlQuery: {
            esql,
          },
          timeField,
        },
      };
    }

    embeddable.createAlertRule(initialValues, this.ruleTypeRegistry, this.actionTypeRegistry);
  }
}

const getDataFromEmbeddable = (embeddable: Context['embeddable']): AlertRuleFromVisUIActionData => {
  const queryValue = embeddable.query$.getValue();
  const query = queryValue && 'esql' in queryValue ? queryValue.esql : null;
  const datatable = Object.values(
    embeddable.getInspectorAdapters().tables.tables ?? {}
  )[0] as unknown as Datatable | undefined;

  const dataView = query
    ? undefined
    : embeddable.dataViews$.getValue()?.find((view) => view.id === datatable?.meta?.source);

  const { state } = embeddable.serializeState().rawState.attributes ?? {};
  const layers = (state?.datasourceStates?.textBased as TextBasedPersistedState | undefined)
    ?.layers;
  const [firstLayer] = Object.values(layers ?? {});

  const { timeField = 'timestamp' } = firstLayer ?? { timeField: dataView?.timeFieldName };

  const thresholdValues = datatable
    ? datatable.columns
        .filter((col) => col.meta.dimensionName === 'Vertical axis')
        .reduce((result, { meta }) => {
          const { sourceField = missingYFieldPlaceholder } = meta.sourceParams ?? {};
          return {
            ...result,
            [String(sourceField)]: i18n.translate(
              'alertsUIShared.alertRuleFromVis.thresholdPlaceholder',
              {
                defaultMessage: '[THRESHOLD]',
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
          const { sourceField = missingXFieldPlaceholder } = meta.sourceParams ?? {};
          return {
            ...result,
            [String(sourceField)]: [
              i18n.translate('alertsUIShared.alertRuleFromVis.splitValuePlaceholder', {
                defaultMessage: '[VALUE]',
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
    dataView,
  };
};

const missingSourceFieldPlaceholder = i18n.translate(
  'alertsUIShared.alertRuleFromVis.fieldNamePlaceholder',
  {
    defaultMessage: '[FIELD NAME]',
  }
);

const missingYFieldPlaceholder = i18n.translate(
  'alertsUIShared.alertRuleFromVis.yAxisPlaceholder',
  {
    defaultMessage: '[Y AXIS]',
  }
);

const missingXFieldPlaceholder = i18n.translate(
  'alertsUIShared.alertRuleFromVis.xAxisPlaceholder',
  {
    defaultMessage: '[X AXIS]',
  }
);
