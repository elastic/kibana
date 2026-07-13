/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiButtonEmpty } from '@elastic/eui';
import { ExportJsonFlyout, ExportJsonFlyoutContext } from '@kbn/as-code-export-utils';
import { i18n } from '@kbn/i18n';
import type { LensWireAPIConfig } from '@kbn/lens-common-2';
import type { ExportShareParameters } from '@kbn/share-plugin/public';

import React from 'react';
import { coreServices, shareServices } from './services/kibana_services';

export const ExportJsonConfig: ExportShareParameters = {
  label: ({ openFlyout }) => (
    <EuiButtonEmpty
      size="s"
      iconType="code"
      onClick={openFlyout}
      data-test-subj="exportMenuItem-JSON"
    >
      {i18n.translate('links.exportJson.label', {
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
        <ExportJsonFlyout<LensWireAPIConfig, LensWireAPIConfig>
          closeFlyout={closeFlyout}
          sanitizeState={async (state: LensWireAPIConfig) => {
            return { data: state, warnings: [] };
          }}
          apiPath={'/api/markdowns'}
        />
      </ExportJsonFlyoutContext.Provider>
    );
  },
};
