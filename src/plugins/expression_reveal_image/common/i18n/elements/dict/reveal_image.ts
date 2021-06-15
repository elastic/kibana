/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { i18n } from '@kbn/i18n';
import { ElementStrings } from '../../../types';

export const strings: ElementStrings = {
  displayName: i18n.translate('expressionRevealImage.elements.revealImageDisplayName', {
    defaultMessage: 'Image reveal',
  }),
  help: i18n.translate('expressionRevealImage.elements.revealImageHelpText', {
    defaultMessage: 'Reveals a percentage of an image',
  }),
};
