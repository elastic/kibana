/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ObservabilityIndexes } from '@kbn/discover-utils/src';
import React from 'react';
import { DataSourcesProvider } from '../../../../../../hooks/use_data_sources';
import { DocViewerExtensionActionsProvider } from '../../../../../../hooks/use_doc_viewer_extension_actions';
import { DocumentDetailFlyout, type DocumentDetailFlyoutProps } from './document_detail_flyout';

export type { TraceDocFlyoutType } from '../../../common/types';

export interface TraceDocFlyoutProps extends DocumentDetailFlyoutProps {
  indexes: ObservabilityIndexes;
}

export function TraceDocFlyout({ indexes, ...rest }: TraceDocFlyoutProps) {
  return (
    // TODO review if makes sense to keep this as null because profiles are tied to discover specifically
    // we might want to pass it as prop and reuse the concept
    <DataSourcesProvider indexes={indexes} profileId="null">
      <DocViewerExtensionActionsProvider>
        <DocumentDetailFlyout {...rest} />
      </DocViewerExtensionActionsProvider>
    </DataSourcesProvider>
  );
}
