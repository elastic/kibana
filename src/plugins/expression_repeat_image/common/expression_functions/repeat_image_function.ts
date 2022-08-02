/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import {
  getElasticOutline,
  isValidUrl,
  resolveWithMissingImage,
} from '@kbn/presentation-util-plugin/common/lib';
import { CONTEXT, BASE64, URL } from '../constants';
import { ExpressionRepeatImageFunction } from '../types';

export const strings = {
  help: i18n.translate('expressionRepeatImage.functions.repeatImageHelpText', {
    defaultMessage: 'Configures a repeating image element.',
  }),
  args: {
    emptyImage: i18n.translate(
      'expressionRepeatImage.functions.repeatImage.args.emptyImageHelpText',
      {
        defaultMessage:
          'Fills the difference between the {CONTEXT} and {maxArg} parameter for the element with this image. ' +
          'Provide an image asset as a {BASE64} data {URL}, or pass in a sub-expression.',
        values: {
          BASE64,
          CONTEXT,
          maxArg: '`max`',
          URL,
        },
      }
    ),
    image: i18n.translate('expressionRepeatImage.functions.repeatImage.args.imageHelpText', {
      defaultMessage:
        'The image to repeat. Provide an image asset as a {BASE64} data {URL}, or pass in a sub-expression.',
      values: {
        BASE64,
        URL,
      },
    }),
    max: i18n.translate('expressionRepeatImage.functions.repeatImage.args.maxHelpText', {
      defaultMessage: 'The maximum number of times the image can repeat.',
    }),
    size: i18n.translate('expressionRepeatImage.functions.repeatImage.args.sizeHelpText', {
      defaultMessage:
        'The maximum height or width of the image, in pixels. ' +
        'When the image is taller than it is wide, this function limits the height.',
    }),
  },
};

const errors = {
  getMissingMaxArgumentErrorMessage: () =>
    i18n.translate('expressionRepeatImage.error.repeatImage.missingMaxArgument', {
      defaultMessage: '{maxArgument} must be set if providing an {emptyImageArgument}',
      values: {
        maxArgument: '`max`',
        emptyImageArgument: '`emptyImage`',
      },
    }),
};

export const repeatImageFunction: ExpressionRepeatImageFunction = () => {
  const { help, args: argHelp } = strings;

  return {
    name: 'repeatImage',
    aliases: [],
    type: 'render',
    inputTypes: ['number'],
    help,
    args: {
      emptyImage: {
        types: ['string', 'null'],
        help: argHelp.emptyImage,
        default: null,
      },
      image: {
        types: ['string', 'null'],
        help: argHelp.image,
        default: null,
      },
      max: {
        types: ['number', 'null'],
        help: argHelp.max,
        default: 1000,
      },
      size: {
        types: ['number'],
        default: 100,
        help: argHelp.size,
      },
    },
    fn: async (count, args) => {
      if (args.emptyImage !== null && isValidUrl(args.emptyImage) && args.max === null) {
        throw new Error(errors.getMissingMaxArgumentErrorMessage());
      }
      const { elasticOutline } = await getElasticOutline();
      return {
        type: 'render',
        as: 'repeatImage',
        value: {
          count: Math.floor(count),
          ...args,
          image: resolveWithMissingImage(args.image, elasticOutline),
          emptyImage: resolveWithMissingImage(args.emptyImage),
        },
      };
    },
  };
};
