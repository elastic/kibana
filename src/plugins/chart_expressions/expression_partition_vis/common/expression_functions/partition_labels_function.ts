/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { ExpressionFunctionDefinition, Datatable } from '../../../../expressions/common';
import { PARTITION_LABELS_FUNCTION, PARTITION_LABELS_VALUE } from '../constants';
import {
  ExpressionValuePartitionLabels,
  LabelPositions,
  PartitionLabelsArguments,
  ValueFormats,
} from '../types';

export const partitionLabelsFunction = (): ExpressionFunctionDefinition<
  typeof PARTITION_LABELS_FUNCTION,
  Datatable | null,
  PartitionLabelsArguments,
  ExpressionValuePartitionLabels
> => ({
  name: PARTITION_LABELS_FUNCTION,
  help: i18n.translate('expressionPartitionVis.partitionLabels.function.help', {
    defaultMessage: 'Generates the partition labels object',
  }),
  type: PARTITION_LABELS_VALUE,
  args: {
    show: {
      types: ['boolean'],
      help: i18n.translate('expressionPartitionVis.partitionLabels.function.args.show.help', {
        defaultMessage: 'Displays the partition chart labels',
      }),
      default: true,
    },
    position: {
      types: ['string'],
      default: 'default',
      help: i18n.translate('expressionPartitionVis.partitionLabels.function.args.position.help', {
        defaultMessage: 'Defines the label position',
      }),
      options: [LabelPositions.DEFAULT, LabelPositions.INSIDE],
    },
    values: {
      types: ['boolean'],
      help: i18n.translate('expressionPartitionVis.partitionLabels.function.args.values.help', {
        defaultMessage: 'Displays the values inside the slices',
      }),
      default: true,
    },
    percentDecimals: {
      types: ['number'],
      help: i18n.translate(
        'expressionPartitionVis.partitionLabels.function.args.percentDecimals.help',
        {
          defaultMessage:
            'Defines the number of decimals that will appear on the values as percent',
        }
      ),
      default: 2,
    },
    // Deprecated
    last_level: {
      types: ['boolean'],
      help: i18n.translate('expressionPartitionVis.partitionLabels.function.args.last_level.help', {
        defaultMessage: 'Show top level labels only for multilayer pie/donut charts',
      }),
      default: false,
    },
    // Deprecated
    truncate: {
      types: ['number', 'null'],
      help: i18n.translate('expressionPartitionVis.partitionLabels.function.args.truncate.help', {
        defaultMessage:
          'Defines the number of characters that the slice value will display only for multilayer pie/donut charts',
      }),
      default: null,
    },
    valuesFormat: {
      types: ['string'],
      default: 'percent',
      help: i18n.translate(
        'expressionPartitionVis.partitionLabels.function.args.valuesFormat.help',
        {
          defaultMessage: 'Defines the format of the values',
        }
      ),
      options: [ValueFormats.PERCENT, ValueFormats.VALUE],
    },
  },
  fn: (context, args) => {
    return {
      type: PARTITION_LABELS_VALUE,
      show: args.show,
      position: args.position,
      percentDecimals: args.percentDecimals,
      values: args.values,
      truncate: args.truncate,
      valuesFormat: args.valuesFormat,
      last_level: args.last_level,
    };
  },
});
