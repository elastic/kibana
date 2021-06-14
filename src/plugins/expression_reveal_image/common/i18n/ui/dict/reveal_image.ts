/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { i18n } from '@kbn/i18n';

export const strings = {
  getDisplayName: () =>
    i18n.translate('expressionRevealImage.uis.views.revealImageTitle', {
      defaultMessage: 'Reveal image',
    }),
  getEmptyImageDisplayName: () =>
    i18n.translate('expressionRevealImage.uis.views.revealImage.args.emptyImageTitle', {
      defaultMessage: 'Background image',
    }),
  getEmptyImageHelp: () =>
    i18n.translate('expressionRevealImage.uis.views.revealImage.args.emptyImageLabel', {
      defaultMessage: 'A background image. Eg, an empty glass',
    }),
  getImageDisplayName: () =>
    i18n.translate('expressionRevealImage.uis.views.revealImage.args.imageTitle', {
      defaultMessage: 'Image',
    }),
  getImageHelp: () =>
    i18n.translate('expressionRevealImage.uis.views.revealImage.args.imageLabel', {
      defaultMessage: 'An image to reveal given the function input. Eg, a full glass',
    }),
  getOriginBottom: () =>
    i18n.translate('expressionRevealImage.uis.views.revealImage.args.origin.bottomDropDown', {
      defaultMessage: 'Bottom',
    }),
  getOriginDisplayName: () =>
    i18n.translate('expressionRevealImage.uis.views.revealImage.args.originTitle', {
      defaultMessage: 'Reveal from',
    }),
  getOriginHelp: () =>
    i18n.translate('expressionRevealImage.uis.views.revealImage.args.originLabel', {
      defaultMessage: 'The direction from which to start the reveal',
    }),
  getOriginLeft: () =>
    i18n.translate('expressionRevealImage.uis.views.revealImage.args.origin.leftDropDown', {
      defaultMessage: 'Left',
    }),
  getOriginRight: () =>
    i18n.translate('expressionRevealImage.uis.views.revealImage.args.origin.rightDropDown', {
      defaultMessage: 'Right',
    }),
  getOriginTop: () =>
    i18n.translate('expressionRevealImage.uis.views.revealImage.args.origin.topDropDown', {
      defaultMessage: 'Top',
    }),
};
