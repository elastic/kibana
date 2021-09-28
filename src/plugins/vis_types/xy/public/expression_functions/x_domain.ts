/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { uniq } from 'lodash';
import { unitOfTime } from 'moment';
import { ExpressionValueVisDimension } from '../../../../visualizations/common';
import type { ExpressionFunctionDefinition, Datatable } from '../../../../expressions/public';
import { getAdjustedInterval } from '../../common';
import { XDomainArguments, ExpressionValueXDomain } from '../types';
import { getValueByAccessor } from '../utils/accessors';

export const X_DOMAIN_EXPRESSION = 'x_domain';

export const getAdjustedDomain = (
  data: Datatable['rows'],
  column: ExpressionValueVisDimension,
  domain: {
    intervalValue: number;
    intervalUnit: string;
    min: number;
    max: number;
    minInterval?: number;
  },
  timezone?: string,
  considerInterval?: boolean
) => {
  const values = uniq(data.map((row) => getValueByAccessor(row, column.accessor)).sort());
  const [first] = values;
  const last = values[values.length - 1];
  const domainMin = Math.min(first, domain.min);
  const domainMaxValue = Math.max(domain.max - (domain.minInterval ?? 0), last);
  const domainMax = considerInterval ? domainMaxValue + (domain.minInterval ?? 0) : domainMaxValue;
  const minInterval = getAdjustedInterval(
    values,
    domain.intervalValue,
    domain.intervalUnit as unitOfTime.Base,
    timezone ?? ''
  );

  return {
    min: domainMin,
    max: domainMax,
    minInterval,
  };
};

export const xDomain = (): ExpressionFunctionDefinition<
  'x_domain',
  Datatable | null,
  XDomainArguments,
  ExpressionValueXDomain
> => ({
  name: X_DOMAIN_EXPRESSION,
  help: i18n.translate('visTypeXy.function.xDomain.help', {
    defaultMessage: 'Generates the axis settings',
  }),
  type: X_DOMAIN_EXPRESSION,
  args: {
    minInterval: {
      types: ['number'],
      help: i18n.translate('visTypeXy.function.xDomain.minInterval.help', {
        defaultMessage: 'Minimum interval between two axis points',
      }),
    },

    intervalUnit: {
      types: ['string'],
      help: i18n.translate('visTypeXy.function.xDomain.intervalUnit.help', {
        defaultMessage: 'Interval unit',
      }),
    },

    intervalValue: {
      types: ['number'],
      help: i18n.translate('visTypeXy.function.xDomain.intervalValue.help', {
        defaultMessage: 'Interval value',
      }),
    },

    column: {
      types: ['vis_dimension'],
      help: i18n.translate('visTypeXy.function.xDomain.column.help', {
        defaultMessage: 'The column which is the domain (axis) values',
      }),
    },

    timezone: {
      types: ['string'],
      help: i18n.translate('visTypeXy.function.xDomain.timezone.help', {
        defaultMessage: 'Timezone',
      }),
    },

    considerInterval: {
      types: ['boolean'],
      help: i18n.translate('visTypeXy.function.xDomain.considerInterval.help', {
        defaultMessage:
          'Flag, which is showing if the minimum interval should be added to the max domain point or ignored',
      }),
    },

    min: {
      types: ['number'],
      help: i18n.translate('visTypeXy.function.xDomain.min.help', {
        defaultMessage: 'Minimum point of the domain (axis)',
      }),
    },

    max: {
      types: ['number'],
      help: i18n.translate('visTypeXy.function.xDomain.max.help', {
        defaultMessage: 'Maximum point of the domain (axis)',
      }),
    },

    logBase: {
      types: ['string'],
      help: i18n.translate('visTypeXy.function.xDomain.logBase.help', {
        defaultMessage: 'The logarithm base for scaling the axis values',
      }),
    },

    coordinates: {
      types: ['string', 'number'],
      help: i18n.translate('visTypeXy.function.xDomain.coordinates.help', {
        defaultMessage: 'The list of predefined points on the axis',
      }),
      multi: true,
    },
  },
  fn: (context, args) => {
    const {
      min,
      max,
      minInterval,
      logBase,
      coordinates,
      column,
      intervalUnit,
      intervalValue,
      timezone,
      considerInterval,
    } = args;

    const domain = { min, max, minInterval, logBase, coordinates };

    if (
      intervalUnit &&
      intervalValue !== undefined &&
      min !== undefined &&
      max !== undefined &&
      column !== undefined
    ) {
      const adjusted = getAdjustedDomain(
        context?.rows ?? [],
        column,
        {
          min,
          max,
          minInterval,
          intervalValue,
          intervalUnit,
        },
        timezone,
        considerInterval
      );

      return {
        type: X_DOMAIN_EXPRESSION,
        ...domain,
        adjusted,
      };
    }
    return { type: X_DOMAIN_EXPRESSION, ...domain, adjusted: minInterval ? { minInterval } : {} };
  },
});
