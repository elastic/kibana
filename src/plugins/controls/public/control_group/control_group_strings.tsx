/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';

export const ControlGroupStrings = {
  getSaveChangesTitle: () =>
    i18n.translate('controls.controlGroup.manageControl.saveChangesTitle', {
      defaultMessage: 'Save',
    }),
  getCancelTitle: () =>
    i18n.translate('controls.controlGroup.manageControl.cancelTitle', {
      defaultMessage: 'Cancel',
    }),
  management: {
    getApplyButtonTitle: (hasUnappliedSelections: boolean) =>
      hasUnappliedSelections
        ? i18n.translate('controls.controlGroup.management.applyButtonTooltip.enabled', {
            defaultMessage: 'Apply selections',
          })
        : i18n.translate('controls.controlGroup.management.applyButtonTooltip.disabled', {
            defaultMessage: 'No new selections to apply',
          }),
    getFlyoutTitle: () =>
      i18n.translate('controls.controlGroup.management.flyoutTitle', {
        defaultMessage: 'Control settings',
      }),
    getDeleteAllButtonTitle: () =>
      i18n.translate('controls.controlGroup.management.deleteAll', {
        defaultMessage: 'Delete all',
      }),
    labelPosition: {
      getLabelPositionTitle: () =>
        i18n.translate('controls.controlGroup.management.labelPosition.title', {
          defaultMessage: 'Label position',
        }),
      getLabelPositionLegend: () =>
        i18n.translate('controls.controlGroup.management.labelPosition.designSwitchLegend', {
          defaultMessage: 'Switch label position between inline and above',
        }),
      getInlineTitle: () =>
        i18n.translate('controls.controlGroup.management.labelPosition.inline', {
          defaultMessage: 'Inline',
        }),
      getAboveTitle: () =>
        i18n.translate('controls.controlGroup.management.labelPosition.above', {
          defaultMessage: 'Above',
        }),
    },
    selectionSettings: {
      getSelectionSettingsTitle: () =>
        i18n.translate('controls.controlGroup.management.selectionSettings', {
          defaultMessage: 'Selections',
        }),
      validateSelections: {
        getValidateSelectionsTitle: () =>
          i18n.translate('controls.controlGroup.management.validate.title', {
            defaultMessage: 'Validate user selections',
          }),
        getValidateSelectionsTooltip: () =>
          i18n.translate('controls.controlGroup.management.validate.tooltip', {
            defaultMessage: 'Highlight control selections that result in no data.',
          }),
      },
      controlChaining: {
        getHierarchyTitle: () =>
          i18n.translate('controls.controlGroup.management.hierarchy.title', {
            defaultMessage: 'Chain controls',
          }),
        getHierarchyTooltip: () =>
          i18n.translate('controls.controlGroup.management.hierarchy.tooltip', {
            defaultMessage:
              'Selections in one control narrow down available options in the next. Controls are chained from left to right.',
          }),
      },
      showApplySelections: {
        getShowApplySelectionsTitle: () =>
          i18n.translate('controls.controlGroup.management.showApplySelections.title', {
            defaultMessage: 'Apply selections automatically',
          }),
        getShowApplySelectionsTooltip: () =>
          i18n.translate('controls.controlGroup.management.showApplySelections.tooltip', {
            defaultMessage:
              'If disabled, control selections will only be applied after clicking apply.',
          }),
      },
    },
    filteringSettings: {
      getFilteringSettingsTitle: () =>
        i18n.translate('controls.controlGroup.management.filteringSettings', {
          defaultMessage: 'Filtering',
        }),
      getUseGlobalFiltersTitle: () =>
        i18n.translate('controls.controlGroup.management.filtering.useGlobalFilters', {
          defaultMessage: 'Apply global filters to controls',
        }),
      getUseGlobalTimeRangeTitle: () =>
        i18n.translate('controls.controlGroup.management.filtering.useGlobalTimeRange', {
          defaultMessage: 'Apply global time range to controls',
        }),
    },
  },
};
