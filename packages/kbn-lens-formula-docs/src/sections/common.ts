/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

export const commonFormulas = {
  label: i18n.translate('lensFormulaDocs.frequentlyUsedHeading', {
    defaultMessage: 'Common formulas',
  }),
  description: i18n.translate('lensFormulaDocs.CommonFormulaDocumentation', {
    defaultMessage: `The most common formulas are dividing two values to produce a percent. To display accurately, set "value format" to "percent".`,
  }),
  items: [
    {
      label: i18n.translate('lensFormulaDocs.documentation.filterRatio', {
        defaultMessage: 'Filter ratio',
      }),
      description: i18n.translate('lensFormulaDocs.documentation.filterRatioDescription.markdown', {
        defaultMessage: `### Filter ratio:

Use \`kql=''\` to filter one set of documents and compare it to other documents within the same grouping.
For example, to see how the error rate changes over time:

\`\`\`
count(kql='response.status_code > 400') / count()
\`\`\`
  `,

        description:
          'Text is in markdown. Do not translate function names, special characters, or field names like sum(bytes)',
      }),
    },
    {
      label: i18n.translate('lensFormulaDocs.documentation.weekOverWeek', {
        defaultMessage: 'Week over week',
      }),
      description: i18n.translate(
        'lensFormulaDocs.documentation.weekOverWeekDescription.markdown',
        {
          defaultMessage: `### Week over week:

Use \`shift='1w'\` to get the value of each grouping from
the previous week. Time shift should not be used with the *Top values* function.

\`\`\`
percentile(system.network.in.bytes, percentile=99) /
percentile(system.network.in.bytes, percentile=99, shift='1w')
\`\`\`
      `,

          description:
            'Text is in markdown. Do not translate function names, special characters, or field names like sum(bytes)',
        }
      ),
    },
    {
      label: i18n.translate('lensFormulaDocs.documentation.percentOfTotal', {
        defaultMessage: 'Percent of total',
      }),
      description: i18n.translate(
        'lensFormulaDocs.documentation.percentOfTotalDescription.markdown',
        {
          defaultMessage: `### Percent of total

Formulas can calculate \`overall_sum\` for all the groupings,
which lets you convert each grouping into a percent of total:

\`\`\`
sum(products.base_price) / overall_sum(sum(products.base_price))
\`\`\`
      `,

          description:
            'Text is in markdown. Do not translate function names, special characters, or field names like sum(bytes)',
        }
      ),
    },
    {
      label: i18n.translate('lensFormulaDocs.documentation.recentChange', {
        defaultMessage: 'Recent change',
      }),
      description: i18n.translate(
        'lensFormulaDocs.documentation.recentChangeDescription.markdown',
        {
          defaultMessage: `### Recent change

Use \`reducedTimeRange='30m'\` to add an additional filter on the time range of a metric aligned with the end of the global time range. This can be used to calculate how much a value changed recently.

\`\`\`
max(system.network.in.bytes, reducedTimeRange="30m")
- min(system.network.in.bytes, reducedTimeRange="30m")
\`\`\`
  `,

          description:
            'Text is in markdown. Do not translate function names, special characters, or field names like sum(bytes)',
        }
      ),
    },
  ],
};
