/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useState } from 'react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import { DeferredSpinner, DocViewer } from '@kbn/unified-doc-viewer';
import { EuiSkeletonText } from '@elastic/eui';
import { getUnifiedDocViewerServices } from '../../plugin';
import type { UnifiedDocViewerServices } from '../../types';

export function UnifiedDocViewer(props: DocViewRenderProps) {
  const [services, setServices] = useState<UnifiedDocViewerServices | null>(null);
  useEffect(() => {
    getUnifiedDocViewerServices().then((value) => setServices(value));
  }, []);

  return services === null ? (
    <DeferredSpinner>
      <EuiSkeletonText />
    </DeferredSpinner>
  ) : (
    <KibanaContextProvider services={services}>
      <DocViewer docViews={services.unifiedDocViewer.getDocViews(props.hit)} {...props} />
    </KibanaContextProvider>
  );
}
