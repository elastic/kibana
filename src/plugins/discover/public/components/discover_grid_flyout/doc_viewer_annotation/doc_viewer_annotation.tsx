/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { css } from '@emotion/react';
import { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import AnnotationEditorControls from '@kbn/event-annotation-components/components/annotation_editor_controls/annotation_editor_controls';
import { EventAnnotationConfig } from '@kbn/event-annotation-common/types';
import { getDefaultManualAnnotation } from '@kbn/event-annotation-common';
import { useDiscoverServices } from '../../../hooks/use_discover_services';
import { PLUGIN_ID } from '../../../../common';

export const DocViewerAnnotation = ({ dataView, hit }: DocViewRenderProps) => {
  // const timeFieldName = dataView.getTimeField()?.name;
  // const timeFieldValue = timeFieldName
  //   ? Array.isArray(hit.flattened[timeFieldName])
  //     ? hit.flattened[timeFieldName][0]
  //     : hit.flattened[timeFieldName]
  //   : undefined;
  // const timestamp = timeFieldValue ? timeFieldValue : undefined;
  const [currentAnnotation, setCurrentAnnotation] = useState<EventAnnotationConfig>(() =>
    getDefaultManualAnnotation(uuidv4(), new Date().toISOString())
  );
  const services = useDiscoverServices();
  return (
    <div
      css={css`
        .lnsDimensionEditorSection:first-child {
          margin-top: 8px;

          .lnsDimensionEditorSection__border {
            display: none;
          }
        }
      `}
    >
      <AnnotationEditorControls
        annotation={currentAnnotation}
        onAnnotationChange={(annotation) => {
          // console.log(annotation);
        }}
        getDefaultRangeEnd={(rangeStart) => rangeStart}
        dataView={dataView}
        appName={PLUGIN_ID}
        queryInputServices={services}
      />
    </div>
  );
};
