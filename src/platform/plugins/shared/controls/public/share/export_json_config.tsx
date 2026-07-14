/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { EuiButtonEmpty } from '@elastic/eui';
import { ExportJsonFlyout, ExportJsonFlyoutContext } from '@kbn/as-code-export-utils';
import type {
  ESQL_CONTROL,
  OPTIONS_LIST_CONTROL,
  RANGE_SLIDER_CONTROL,
  UNPINNABLE_CONTROL_TYPES,
} from '@kbn/controls-constants';
import type {
  OptionsListControlState,
  OptionsListESQLControlState,
  RangeSliderControlState,
} from '@kbn/controls-schemas';
import { i18n } from '@kbn/i18n';
import type { ExportShareParameters } from '@kbn/share-plugin/public';

import { coreServices, shareServices } from '../services/kibana_services';

export const getExportJsonConfig = (
  controlType: (typeof UNPINNABLE_CONTROL_TYPES)[number]
): ExportShareParameters => ({
  label: ({ openFlyout }) => (
    <EuiButtonEmpty
      size="s"
      iconType="code"
      onClick={openFlyout}
      data-test-subj="exportMenuItem-JSON"
    >
      {i18n.translate('controls.exportJson.label', {
        defaultMessage: 'JSON',
      })}
    </EuiButtonEmpty>
  ),
  shouldRender: () => true,
  flyoutSizing: {
    size: 'm',
    maxWidth: 1000,
  },
  flyoutContent: ({ closeFlyout }) => {
    return (
      <ExportJsonFlyoutContext.Provider
        value={{ services: { core: coreServices, share: shareServices } }}
      >
        <ExportJsonFlyout<
          typeof controlType extends typeof OPTIONS_LIST_CONTROL
            ? OptionsListControlState
            : typeof controlType extends typeof RANGE_SLIDER_CONTROL
            ? RangeSliderControlState
            : typeof controlType extends typeof ESQL_CONTROL
            ? OptionsListESQLControlState
            : {}
        >
          closeFlyout={closeFlyout}
        />
      </ExportJsonFlyoutContext.Provider>
    );
  },
});
