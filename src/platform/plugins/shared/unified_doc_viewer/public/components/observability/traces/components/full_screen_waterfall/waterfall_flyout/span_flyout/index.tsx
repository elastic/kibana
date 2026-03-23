/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataTableRecord } from '@kbn/discover-utils';
import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import React, { useEffect, useState } from 'react';
import type { OverviewApi } from '../../../../doc_viewer_overview/overview';
import { Overview, type TraceOverviewSections } from '../../../../doc_viewer_overview/overview';
import { useDataSourcesContext } from '../../../../../../../hooks/use_data_sources';
import { useDocViewerExtensionActionsContext } from '../../../../../../../hooks/use_doc_viewer_extension_actions';
export { useSpanFlyoutData } from './use_span_flyout_data';
export type { UseSpanFlyoutDataParams, SpanFlyoutData } from './use_span_flyout_data';

export const spanFlyoutId = 'spanDetailFlyout' as const;

export interface SpanFlyoutContentProps {
  hit: DataTableRecord;
  dataView: DocViewRenderProps['dataView'];
  activeSection?: TraceOverviewSections;
}

export function SpanFlyoutContent({ hit, dataView, activeSection }: SpanFlyoutContentProps) {
  const { indexes } = useDataSourcesContext();
  const [flyoutRef, setFlyoutRef] = useState<OverviewApi | null>(null);
  const actions = useDocViewerExtensionActionsContext();

  useEffect(() => {
    if (activeSection && flyoutRef) {
      flyoutRef.openAndScrollToSection(activeSection);
    }
  }, [activeSection, flyoutRef]);

  return (
    <Overview
      ref={setFlyoutRef}
      docViewActions={actions}
      hit={hit}
      indexes={indexes}
      showWaterfall={false}
      showActions={false}
      dataView={dataView}
    />
  );
}
