/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useCallback } from 'react';
import { EuiButton, EuiSpacer, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { v4 as uuidv4 } from 'uuid';
import { css } from '@emotion/react';
import { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import AnnotationEditorControls from '@kbn/event-annotation-components/components/annotation_editor_controls/annotation_editor_controls';
import { getDefaultManualAnnotation } from '@kbn/event-annotation-common';
import { useDiscoverServices } from '../../../hooks/use_discover_services';
import { PLUGIN_ID } from '../../../../common';
import { useDocViewerAnnotationContext } from './doc_viewer_annotation_context';

export const DocViewerAnnotation: React.FC<DocViewRenderProps> = ({ dataView }) => {
  const { docVisAnnotation, onDocVisAnnotationChanged } = useDocViewerAnnotationContext();
  // const timeFieldName = dataView.getTimeField()?.name;
  // const timeFieldValue = timeFieldName
  //   ? Array.isArray(hit.flattened[timeFieldName])
  //     ? hit.flattened[timeFieldName][0]
  //     : hit.flattened[timeFieldName]
  //   : undefined;
  // const timestamp = timeFieldValue ? timeFieldValue : undefined;
  const services = useDiscoverServices();

  const createAnnotation = useCallback(() => {
    onDocVisAnnotationChanged?.(getDefaultManualAnnotation(uuidv4(), new Date().toISOString()));
  }, [onDocVisAnnotationChanged]);

  const deleteAnnotation = useCallback(() => {
    onDocVisAnnotationChanged?.(undefined);
  }, [onDocVisAnnotationChanged]);

  if (!docVisAnnotation) {
    return (
      <>
        <EuiSpacer />
        <EuiButton onClick={createAnnotation}>
          {i18n.translate('discover.grid.docVisAnnotation.createButton', {
            defaultMessage: 'Create annotation',
          })}
        </EuiButton>
      </>
    );
  }

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
        annotation={docVisAnnotation}
        onAnnotationChange={(annotation) => {
          // console.log(annotation);
        }}
        getDefaultRangeEnd={(rangeStart) => rangeStart}
        dataView={dataView}
        appName={PLUGIN_ID}
        queryInputServices={services}
      />
      <EuiSpacer size="s" />
      <EuiFlexGroup justifyContent="flexEnd" direction="row" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiButton onClick={deleteAnnotation}>
            {i18n.translate('discover.grid.docVisAnnotation.deleteButton', {
              defaultMessage: 'Delete annotation',
            })}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};
