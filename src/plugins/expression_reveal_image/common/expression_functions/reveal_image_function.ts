/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import {
  resolveWithMissingImage,
  getElasticOutline,
  isValidUrl,
} from '@kbn/presentation-util-plugin/common/lib';
import { ExpressionRevealImageFunction, Origin, Position } from '../types';
import { BASE64, URL } from '../constants';

const strings = {
  help: i18n.translate('expressionRevealImage.functions.revealImageHelpText', {
    defaultMessage: 'Configures an image reveal element.',
  }),
  args: {
    image: i18n.translate('expressionRevealImage.functions.revealImage.args.imageHelpText', {
      defaultMessage:
        'The image to reveal. Provide an image asset as a {BASE64} data {URL}, ' +
        'or pass in a sub-expression.',
      values: {
        BASE64,
        URL,
      },
    }),
    emptyImage: i18n.translate(
      'expressionRevealImage.functions.revealImage.args.emptyImageHelpText',
      {
        defaultMessage:
          'An optional background image to reveal over. ' +
          'Provide an image asset as a `{BASE64}` data {URL}, or pass in a sub-expression.',
        values: {
          BASE64,
          URL,
        },
      }
    ),
    origin: i18n.translate('expressionRevealImage.functions.revealImage.args.originHelpText', {
      defaultMessage: 'The position to start the image fill. For example, {list}, or {end}.',
      values: {
        list: Object.values(Position)
          .slice(0, -1)
          .map((position) => `\`"${position}"\``)
          .join(', '),
        end: Object.values(Position).slice(-1)[0],
      },
    }),
  },
};

export const errors = {
  invalidPercent: (percent: number) =>
    new Error(
      i18n.translate('expressionRevealImage.functions.revealImage.invalidPercentErrorMessage', {
        defaultMessage: "Invalid value: '{percent}'. Percentage must be between 0 and 1",
        values: {
          percent,
        },
      })
    ),
  invalidImageUrl: (imageUrl: string) =>
    new Error(
      i18n.translate('expressionRevealImage.functions.revealImage.invalidImageUrl', {
        defaultMessage: "Invalid image url: '{imageUrl}'.",
        values: {
          imageUrl,
        },
      })
    ),
};

export const revealImageFunction: ExpressionRevealImageFunction = () => {
  const { help, args: argHelp } = strings;

  return {
    name: 'revealImage',
    aliases: [],
    type: 'render',
    inputTypes: ['number'],
    help,
    args: {
      image: {
        types: ['string', 'null'],
        help: argHelp.image,
        default: null,
      },
      emptyImage: {
        types: ['string', 'null'],
        help: argHelp.emptyImage,
        default: null,
      },
      origin: {
        types: ['string'],
        help: argHelp.origin,
        default: 'bottom',
        options: Object.values(Origin),
      },
    },
    fn: async (percent, args) => {
      if (percent > 1 || percent < 0) {
        throw errors.invalidPercent(percent);
      }

      if (args.image && !isValidUrl(args.image)) {
        throw errors.invalidImageUrl(args.image);
      }

      const { elasticOutline } = await getElasticOutline();
      return {
        type: 'render',
        as: 'revealImage',
        value: {
          percent,
          ...args,
          image: resolveWithMissingImage(args.image, elasticOutline) as string,
          emptyImage: resolveWithMissingImage(args.emptyImage) as string,
        },
      };
    },
  };
};
