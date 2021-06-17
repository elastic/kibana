/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback } from 'react';
import { EuiSpacer, EuiTitle, EuiButton, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

import { AnnotationRow, newAnnotation } from './annotation_row';
import { collectionActions } from './lib/collection_actions';
import type { AnnotationRowProps } from './annotation_row';

export const AnnotationsEditor = (props: Omit<AnnotationRowProps, 'annotation'>) => {
  const { annotations } = props.model;

  const handleClick = useCallback(() => collectionActions.handleAdd(props, newAnnotation), [props]);

  const content = annotations?.length ? (
    <div>
      <EuiTitle size="s">
        <span>
          <FormattedMessage
            id="visTypeTimeseries.annotationsEditor.dataSourcesLabel"
            defaultMessage="Data sources"
          />
        </span>
      </EuiTitle>
      <EuiSpacer size="m" />
      {annotations.map((annotation) => (
        <AnnotationRow key={annotation.id} annotation={annotation} {...props} />
      ))}
    </div>
  ) : (
    <EuiText textAlign="center">
      <p>
        <FormattedMessage
          id="visTypeTimeseries.annotationsEditor.howToCreateAnnotationDataSourceDescription"
          defaultMessage="Click the button below to create an annotation data source."
        />
      </p>
      <EuiButton fill onClick={handleClick}>
        <FormattedMessage
          id="visTypeTimeseries.annotationsEditor.addDataSourceButtonLabel"
          defaultMessage="Add data source"
        />
      </EuiButton>
    </EuiText>
  );

  return <div className="tvbAnnotationsEditor__container">{content}</div>;
};
