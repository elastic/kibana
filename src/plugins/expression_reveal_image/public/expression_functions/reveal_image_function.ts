/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { resolveWithMissingImage } from '../../common/lib/resolve_dataurl';
import { elasticOutline } from '../../common/lib/elastic_outline';
import { getFunctionHelp, getFunctionErrors } from '../../common/i18n';
import { ExpressionRevealImageFunction, Origin } from '../../common/types';

export const revealImageFunction: ExpressionRevealImageFunction = () => {
  const { help, args: argHelp } = getFunctionHelp().revealImage;
  const errors = getFunctionErrors().revealImage;

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
        default: elasticOutline,
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
    fn: (percent, args) => {
      if (percent > 1 || percent < 0) {
        throw errors.invalidPercent(percent);
      }

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
