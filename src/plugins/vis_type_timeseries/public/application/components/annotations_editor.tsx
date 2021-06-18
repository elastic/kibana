/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback } from 'react';
import uuid from 'uuid';
import { EuiSpacer, EuiTitle, EuiButton, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

import { AnnotationRow } from './annotation_row';
import { collectionActions, CollectionActionsProps } from './lib/collection_actions';

import type { PanelSchema, AnnotationItemsSchema } from '../../../common/types';
import type { VisFields } from '../lib/fetch_fields';

interface AnnotationsEditorProps {
  fields: VisFields;
  model: PanelSchema;
  onChange: (partialModel: Partial<PanelSchema>) => void;
}

export const newAnnotation = () => ({
  id: uuid.v1(),
  color: '#F00',
  index_pattern: '',
  time_field: '',
  icon: 'fa-tag',
  ignore_global_filters: 1,
  ignore_panel_filters: 1,
});

const NoContent = ({ handleAdd }: { handleAdd: () => void }) => (
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

const getCollectionActionsProps = (props: AnnotationsEditorProps) =>
  ({
    name: 'annotations',
    ...props,
  } as CollectionActionsProps<PanelSchema>);

export const AnnotationsEditor = (props: AnnotationsEditorProps) => {
  const { annotations } = props.model;

  const handleAdd = useCallback(
    () => collectionActions.handleAdd(getCollectionActionsProps(props), newAnnotation),
    [props]
  );

  const handleDelete = useCallback(
    (annotation) => () =>
      collectionActions.handleDelete(getCollectionActionsProps(props), annotation),
    [props]
  );

  const onChange = useCallback(
    (annotation: AnnotationItemsSchema) => {
      return (part: Partial<AnnotationItemsSchema>) =>
        collectionActions.handleChange(getCollectionActionsProps(props), {
          ...annotation,
          ...part,
        });
    },
    [props]
  );

  return (
    <div className="tvbAnnotationsEditor__container">
      {annotations?.length ? (
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
          {annotations.map((annotation: AnnotationItemsSchema) => (
            <AnnotationRow
              key={annotation.id}
              annotation={annotation}
              fields={props.fields}
              onChange={onChange(annotation)}
              handleAdd={handleAdd}
              handleDelete={handleDelete(annotation)}
            />
          ))}
        </div>
      ) : (
        <NoContent handleAdd={handleAdd} />
      )}
    </div>
  );
};
