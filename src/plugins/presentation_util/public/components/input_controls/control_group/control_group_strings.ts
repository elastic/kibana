/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

export const ControlGroupStrings = {
  management: {
    getManageButtonTitle: () =>
      i18n.translate('presentationUtil.inputControls.controlGroup.management.buttonTitle', {
        defaultMessage: 'Manage controls',
      }),
    getFlyoutTitle: () =>
      i18n.translate('presentationUtil.inputControls.controlGroup.management.flyoutTitle', {
        defaultMessage: 'Manage controls',
      }),
    getDesignTitle: () =>
      i18n.translate('presentationUtil.inputControls.controlGroup.management.designTitle', {
        defaultMessage: 'Design',
      }),
    getLayoutTitle: () =>
      i18n.translate('presentationUtil.inputControls.controlGroup.management.layoutTitle', {
        defaultMessage: 'Layout',
      }),
    getDeleteAllButtonTitle: () =>
      i18n.translate('presentationUtil.inputControls.controlGroup.management.deleteAll', {
        defaultMessage: 'Delete all',
      }),
    controlWidth: {
      getChangeAllControlWidthsTitle: () =>
        i18n.translate(
          'presentationUtil.inputControls.controlGroup.management.layout.changeAllControlWidths',
          {
            defaultMessage: 'Set width for all controls',
          }
        ),
      getWidthSwitchLegend: () =>
        i18n.translate(
          'presentationUtil.inputControls.controlGroup.management.layout.controlWidthLegend',
          {
            defaultMessage: 'Change individual control width',
          }
        ),
      getAutoWidthTitle: () =>
        i18n.translate('presentationUtil.inputControls.controlGroup.management.layout.auto', {
          defaultMessage: 'Auto',
        }),
      getSmallWidthTitle: () =>
        i18n.translate('presentationUtil.inputControls.controlGroup.management.layout.small', {
          defaultMessage: 'Small',
        }),
      getMediumWidthTitle: () =>
        i18n.translate('presentationUtil.inputControls.controlGroup.management.layout.medium', {
          defaultMessage: 'Medium',
        }),
      getLargeWidthTitle: () =>
        i18n.translate('presentationUtil.inputControls.controlGroup.management.layout.large', {
          defaultMessage: 'Large',
        }),
    },
    controlStyle: {
      getDesignSwitchLegend: () =>
        i18n.translate(
          'presentationUtil.inputControls.controlGroup.management.layout.designSwitchLegend',
          {
            defaultMessage: 'Switch control designs',
          }
        ),
      getSingleLineTitle: () =>
        i18n.translate('presentationUtil.inputControls.controlGroup.management.layout.singleLine', {
          defaultMessage: 'Single line layout',
        }),
      getTwoLineTitle: () =>
        i18n.translate('presentationUtil.inputControls.controlGroup.management.layout.twoLine', {
          defaultMessage: 'Two line layout',
        }),
    },
  },
};
