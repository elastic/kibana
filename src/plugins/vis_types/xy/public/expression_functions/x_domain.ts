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
  help: i18n.translate('visTypeXy.function.valueaxis.help', {
    defaultMessage: 'Generates value axis object',
  }),
  type: X_DOMAIN_EXPRESSION,
  args: {
    minInterval: {
      types: ['number'],
      help: i18n.translate('visTypeXy.function.xDomain.minInterval.help', {
        defaultMessage: 'Min interval',
      }),
    },

    intervalUnit: {
      types: ['string'],
      help: i18n.translate('visTypeXy.function.xDomain.intervalUnit.help', {
        defaultMessage: 'intervalUnit',
      }),
    },

    intervalValue: {
      types: ['number'],
      help: i18n.translate('visTypeXy.function.xDomain.intervalValue.help', {
        defaultMessage: 'intervalValue',
      }),
    },

    column: {
      types: ['vis_dimension'],
      help: i18n.translate('visTypeXy.function.column.intervalValue.help', {
        defaultMessage: 'column',
      }),
    },

    timezone: {
      types: ['string'],
      help: i18n.translate('visTypeXy.function.xDomain.timezone.help', {
        defaultMessage: 'timezone',
      }),
    },

    considerInterval: {
      types: ['boolean'],
      help: i18n.translate('visTypeXy.function.xDomain.considerInterval.help', {
        defaultMessage: 'considerInterval',
      }),
    },

    min: {
      types: ['number'],
      help: i18n.translate('visTypeXy.function.xDomain.min.help', {
        defaultMessage: 'min',
      }),
    },

    max: {
      types: ['number'],
      help: i18n.translate('visTypeXy.function.xDomain.max.help', {
        defaultMessage: 'max',
      }),
    },

    logBase: {
      types: ['string'],
      help: i18n.translate('visTypeXy.function.xDomain.logBase.help', {
        defaultMessage: 'logBase',
      }),
    },

    coordinates: {
      types: ['string', 'number'],
      help: i18n.translate('visTypeXy.function.xDomain.coordinates.help', {
        defaultMessage: 'coordinates',
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
