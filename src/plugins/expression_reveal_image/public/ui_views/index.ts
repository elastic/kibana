/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { getUIStrings } from '../../common/i18n';

const { revealImage: strings } = getUIStrings();

export const revealImage = () => ({
  name: 'revealImage',
  displayName: strings.getDisplayName(),
  modelArgs: [['_', { label: 'Value' }]],
  args: [
    {
      name: 'image',
      displayName: strings.getImageDisplayName(),
      help: strings.getImageHelp(),
      argType: 'imageUpload',
    },
    {
      name: 'emptyImage',
      displayName: strings.getEmptyImageDisplayName(),
      help: strings.getEmptyImageHelp(),
      argType: 'imageUpload',
    },
    {
      name: 'origin',
      displayName: strings.getOriginDisplayName(),
      help: strings.getOriginHelp(),
      argType: 'select',
      options: {
        choices: [
          { value: 'top', name: strings.getOriginTop() },
          { value: 'left', name: strings.getOriginLeft() },
          { value: 'bottom', name: strings.getOriginBottom() },
          { value: 'right', name: strings.getOriginRight() },
        ],
      },
    },
  ],
});
