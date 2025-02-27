/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { ExpressionShapeFunction, Shape } from '../types';
import { SVG } from '../constants';
import { getAvailableShapes } from '../lib';

export const strings = {
  help: i18n.translate('expressionShape.functions.shapeHelpText', {
    defaultMessage: 'Creates a shape.',
  }),
  args: {
    shape: i18n.translate('expressionShape.functions.shape.args.shapeHelpText', {
      defaultMessage: 'Pick a shape.',
    }),
    border: i18n.translate('expressionShape.functions.shape.args.borderHelpText', {
      defaultMessage: 'An {SVG} color for the border outlining the shape.',
      values: {
        SVG,
      },
    }),
    borderWidth: i18n.translate('expressionShape.functions.shape.args.borderWidthHelpText', {
      defaultMessage: 'The thickness of the border.',
    }),
    fill: i18n.translate('expressionShape.functions.shape.args.fillHelpText', {
      defaultMessage: 'An {SVG} color to fill the shape.',
      values: {
        SVG,
      },
    }),
    maintainAspect: i18n.translate('expressionShape.functions.shape.args.maintainAspectHelpText', {
      defaultMessage: `Maintain the shape's original aspect ratio?`,
    }),
  },
};

export const errors = {
  invalidShape: (shape: string) =>
    new Error(
      i18n.translate('expressionShape.functions.shape.invalidShapeErrorMessage', {
        defaultMessage: "Invalid value: ''{shape}''. Such a shape doesn't exist.",
        values: {
          shape,
        },
      })
    ),
};

export const shapeFunction: ExpressionShapeFunction = () => {
  const { help, args: argHelp } = strings;

  return {
    name: 'shape',
    aliases: [],
    inputTypes: ['null'],
    help,
    args: {
      shape: {
        types: ['string'],
        help: argHelp.shape,
        aliases: ['_'],
        default: 'square',
        options: Object.values(Shape),
      },
      border: {
        types: ['string'],
        aliases: ['stroke'],
        help: argHelp.border,
      },
      borderWidth: {
        types: ['number'],
        aliases: ['strokeWidth'],
        help: argHelp.borderWidth,
        default: 0,
      },
      fill: {
        types: ['string'],
        help: argHelp.fill,
        default: 'black',
      },
      maintainAspect: {
        types: ['boolean'],
        help: argHelp.maintainAspect,
        default: false,
        options: [true, false],
      },
    },
    fn: (input, args) => {
      const avaliableShapes = getAvailableShapes();
      if (!avaliableShapes.includes(args.shape)) {
        throw errors.invalidShape(args.shape);
      }

      return {
        type: 'shape',
        ...args,
      };
    },
  };
};
