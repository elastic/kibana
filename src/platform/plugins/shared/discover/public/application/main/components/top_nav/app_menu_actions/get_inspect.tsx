/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AppMenuActionId, type DiscoverAppMenuItemType } from '@kbn/discover-utils';
import { i18n } from '@kbn/i18n';

export const getInspectAppMenuItem = ({
  onOpenInspector,
}: {
  onOpenInspector: (onClose?: () => void) => void;
}): DiscoverAppMenuItemType => {
  return {
    id: AppMenuActionId.inspect,
    iconType: 'inspect',
    order: 7,
    label: i18n.translate('discover.localMenu.inspectTitle', {
      defaultMessage: 'Inspect',
    }),
    testId: 'openInspectorButton',
    run: ({ context: { onFinishAction } }) => {
      onOpenInspector(onFinishAction);
    },
  };
};
