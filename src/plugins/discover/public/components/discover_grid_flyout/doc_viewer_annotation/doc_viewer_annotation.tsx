/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useCallback, useState } from 'react';
import { EuiButton, EuiSpacer, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
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
  const [currentAnnotation, setCurrentAnnotation] = useState<EventAnnotationConfig>();
  const services = useDiscoverServices();

  const createAnnotation = useCallback(() => {
    setCurrentAnnotation(getDefaultManualAnnotation(uuidv4(), new Date().toISOString()));
  }, [setCurrentAnnotation]);

  const deleteAnnotation = useCallback(() => {
    setCurrentAnnotation(undefined);
  }, [setCurrentAnnotation]);

  if (!currentAnnotation) {
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
        annotation={currentAnnotation}
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
