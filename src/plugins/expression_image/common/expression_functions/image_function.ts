/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { getElasticLogo, resolveWithMissingImage } from '@kbn/presentation-util-plugin/common/lib';
import { BASE64, URL } from '../constants';
import { ExpressionImageFunction, ImageMode } from '../types';

export const strings = {
  help: i18n.translate('expressionImage.functions.imageHelpText', {
    defaultMessage:
      'Displays an image. Provide an image asset as a {BASE64} data {URL}, or pass in a sub-expression.',
    values: {
      BASE64,
      URL,
    },
  }),
  args: {
    dataurl: i18n.translate('expressionImage.functions.image.args.dataurlHelpText', {
      defaultMessage: 'The {https} {URL} or {BASE64} data {URL} of an image.',
      values: {
        BASE64,
        https: 'HTTP(S)',
        URL,
      },
    }),
    mode: i18n.translate('expressionImage.functions.image.args.modeHelpText', {
      defaultMessage:
        '{contain} shows the entire image, scaled to fit. ' +
        '{cover} fills the container with the image, cropping from the sides or bottom as needed. ' +
        '{stretch} resizes the height and width of the image to 100% of the container.',
      values: {
        contain: `\`"${ImageMode.CONTAIN}"\``,
        cover: `\`"${ImageMode.COVER}"\``,
        stretch: `\`"${ImageMode.STRETCH}"\``,
      },
    }),
  },
};

const errors = {
  invalidImageMode: () =>
    i18n.translate('expressionImage.functions.image.invalidImageModeErrorMessage', {
      defaultMessage: '"mode" must be "{contain}", "{cover}", or "{stretch}"',
      values: {
        contain: ImageMode.CONTAIN,
        cover: ImageMode.COVER,
        stretch: ImageMode.STRETCH,
      },
    }),
};

export const imageFunction: ExpressionImageFunction = () => {
  const { help, args: argHelp } = strings;

  return {
    name: 'image',
    aliases: [],
    type: 'image',
    inputTypes: ['null'],
    help,
    args: {
      dataurl: {
        // This was accepting dataurl, but there was no facility in fn for checking type and handling a dataurl type.
        types: ['string', 'null'],
        help: argHelp.dataurl,
        aliases: ['_', 'url'],
        default: null,
      },
      mode: {
        types: ['string'],
        help: argHelp.mode,
        default: 'contain',
        options: Object.values(ImageMode),
      },
    },
    fn: async (input, { dataurl, mode }) => {
      if (!mode || !Object.values(ImageMode).includes(mode)) {
        throw new Error(errors.invalidImageMode());
      }

      const modeStyle = mode === 'stretch' ? '100% 100%' : mode;
      const { elasticLogo } = await getElasticLogo();
      return {
        type: 'image',
        mode: modeStyle,
        dataurl: resolveWithMissingImage(dataurl, elasticLogo) as string,
      };
    },
  };
};
