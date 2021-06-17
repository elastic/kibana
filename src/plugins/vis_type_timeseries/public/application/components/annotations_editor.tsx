/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { ChangeEvent, useCallback } from 'react';
import uuid from 'uuid';
import { EuiSpacer, EuiTitle, EuiButton, EuiText, EuiComboBoxOptionOption } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

import { AnnotationRow } from './annotation_row';
import { collectionActions } from './lib/collection_actions';
import type { Query } from '../../../../../plugins/data/public';
import type { Panel, Annotation } from '../../../common/types';
import type { VisFields } from '../lib/fetch_fields';

export const newAnnotation = () => ({
  id: uuid.v1(),
  color: '#F00',
  index_pattern: '',
  time_field: '',
  icon: 'fa-tag',
  ignore_global_filters: 1,
  ignore_panel_filters: 1,
});

interface AnnotationsEditorProps {
  fields: VisFields;
  model: Panel;
  name: keyof Panel;
  onChange: (partialModel: Partial<Panel>) => void;
}

export const AnnotationsEditor = (props: AnnotationsEditorProps) => {
  const { annotations } = props.model;

  const onChange = useCallback(
    (annotation: Annotation) => {
      return (part: Partial<Annotation>) =>
        collectionActions.handleChange(props, { ...annotation, ...part });
    },
    [props]
  );

  const handleAdd = useCallback(() => collectionActions.handleAdd(props, newAnnotation), [props]);
  const handleDelete = useCallback(
    (annotation) => () => collectionActions.handleDelete(props, annotation),
    [props]
  );
  const handleChange = useCallback(
    (annotation: Annotation, name: string) => {
      return (event: Array<EuiComboBoxOptionOption<string>> | ChangeEvent<HTMLInputElement>) =>
        collectionActions.handleChange(props, {
          ...annotation,
          [name]: Array.isArray(event) ? event?.[0]?.value : event.target.value,
        });
    },
    [props]
  );
  const handleQueryChange = useCallback(
    (annotation: Annotation, filter: Query) =>
      collectionActions.handleChange(props, {
        ...annotation,
        query_string: filter,
      }),
    [props]
  );

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
        <AnnotationRow
          key={annotation.id}
          annotation={annotation}
          fields={props.fields}
          onChange={onChange(annotation)}
          handleAdd={handleAdd}
          handleDelete={handleDelete(annotation)}
          handleChange={handleChange}
          handleQueryChange={handleQueryChange}
        />
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
      <EuiButton fill onClick={handleAdd}>
        <FormattedMessage
          id="visTypeTimeseries.annotationsEditor.addDataSourceButtonLabel"
          defaultMessage="Add data source"
        />
      </EuiButton>
    </EuiText>
  );

  return <div className="tvbAnnotationsEditor__container">{content}</div>;
};
