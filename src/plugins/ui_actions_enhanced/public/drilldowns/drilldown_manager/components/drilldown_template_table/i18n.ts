/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

export const txtSelectableMessage = i18n.translate(
  'uiActionsEnhanced.components.DrilldownTemplateTable.selectableMessage',
  {
    defaultMessage: 'Select this template',
  }
);

export const txtNameColumnTitle = i18n.translate(
  'uiActionsEnhanced.components.DrilldownTemplateTable.nameColumnTitle',
  {
    defaultMessage: 'Name',
    description: 'Title of the first column in drilldown template cloning table.',
  }
);

export const txtSourceColumnTitle = i18n.translate(
  'uiActionsEnhanced.components.DrilldownTemplateTable.sourceColumnTitle',
  {
    defaultMessage: 'Panel',
    description: 'Column title which describes from where the drilldown is cloned.',
  }
);

export const txtActionColumnTitle = i18n.translate(
  'uiActionsEnhanced.components.DrilldownTemplateTable.actionColumnTitle',
  {
    defaultMessage: 'Action',
  }
);

export const txtTriggerColumnTitle = i18n.translate(
  'uiActionsEnhanced.components.DrilldownTemplateTable.triggerColumnTitle',
  {
    defaultMessage: 'Trigger',
  }
);

export const txtSingleItemCopyActionLabel = i18n.translate(
  'uiActionsEnhanced.components.DrilldownTemplateTable.singleItemCopyAction',
  {
    defaultMessage: 'Copy',
    description: '"Copy" action button label in drilldown template cloning table last column.',
  }
);

export const txtCopyButtonLabel = (count: number) =>
  i18n.translate('uiActionsEnhanced.components.DrilldownTemplateTable.copyButtonLabel', {
    defaultMessage: 'Copy ({count})',
    description: 'Label of drilldown template table bottom copy button.',
    values: {
      count,
    },
  });
