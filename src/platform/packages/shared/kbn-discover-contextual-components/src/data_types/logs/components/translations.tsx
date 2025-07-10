/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';

export const jsonLabel = i18n.translate('discover.logs.dataTable.header.popover.json', {
  defaultMessage: 'JSON',
});

export const contentLabel = i18n.translate('discover.logs.dataTable.header.popover.content', {
  defaultMessage: 'Content',
});

export const resourceLabel = i18n.translate('discover.logs.dataTable.header.popover.resource', {
  defaultMessage: 'Resource',
});

export const traceLabel = i18n.translate('discover.traces.dataTable.header.popover.trace', {
  defaultMessage: 'Trace',
});

export const actionFilterForText = (text: string) =>
  i18n.translate('discover.logs.flyoutDetail.value.hover.filterFor', {
    defaultMessage: 'Filter for this {value}',
    values: {
      value: text,
    },
  });

export const actionFilterOutText = (text: string) =>
  i18n.translate('discover.logs.flyoutDetail.value.hover.filterOut', {
    defaultMessage: 'Filter out this {value}',
    values: {
      value: text,
    },
  });

export const filterOutText = i18n.translate('discover.logs.popoverAction.filterOut', {
  defaultMessage: 'Filter out',
});

export const filterForText = i18n.translate('discover.logs.popoverAction.filterFor', {
  defaultMessage: 'Filter for',
});

export const copyValueText = i18n.translate('discover.logs.popoverAction.copyValue', {
  defaultMessage: 'Copy value',
});

export const copyValueAriaText = (fieldName: string) =>
  i18n.translate('discover.logs.popoverAction.copyValueAriaText', {
    defaultMessage: 'Copy value of {fieldName}',
    values: {
      fieldName,
    },
  });

export const openCellActionPopoverAriaText = i18n.translate(
  'discover.logs.popoverAction.openPopover',
  {
    defaultMessage: 'Open popover',
  }
);

export const closeCellActionPopoverText = i18n.translate(
  'discover.logs.popoverAction.closePopover',
  {
    defaultMessage: 'Close popover',
  }
);
