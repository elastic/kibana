/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const txtCreateDrilldown = i18n.translate(
  'xpack.uiActionsEnhanced.components.DrilldownTable.createDrilldownButtonLabel',
  {
    defaultMessage: 'Create new',
  }
);

export const txtEditDrilldown = i18n.translate(
  'xpack.uiActionsEnhanced.components.DrilldownTable.editDrilldownButtonLabel',
  {
    defaultMessage: 'Edit',
  }
);

export const txtCloneDrilldown = i18n.translate(
  'xpack.uiActionsEnhanced.components.DrilldownTable.copyDrilldownButtonLabel',
  {
    defaultMessage: 'Copy',
  }
);

export const txtDeleteDrilldowns = (count: number) =>
  i18n.translate('xpack.uiActionsEnhanced.components.DrilldownTable.deleteDrilldownsButtonLabel', {
    defaultMessage: 'Delete ({count})',
    values: {
      count,
    },
  });

export const txtSelectDrilldown = i18n.translate(
  'xpack.uiActionsEnhanced.components.DrilldownTable.selectThisDrilldownCheckboxLabel',
  {
    defaultMessage: 'Select this drilldown',
  }
);

export const txtName = i18n.translate(
  'xpack.uiActionsEnhanced.components.DrilldownTable.nameColumnTitle',
  {
    defaultMessage: 'Name',
  }
);

export const txtAction = i18n.translate(
  'xpack.uiActionsEnhanced.components.DrilldownTable.actionColumnTitle',
  {
    defaultMessage: 'Action',
  }
);

export const txtTrigger = i18n.translate(
  'xpack.uiActionsEnhanced.components.DrilldownTable.triggerColumnTitle',
  {
    defaultMessage: 'Trigger',
  }
);
