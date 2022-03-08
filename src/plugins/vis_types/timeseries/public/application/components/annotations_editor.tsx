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
import { FormattedMessage } from '@kbn/i18n-react';
import type { IndexPattern } from 'src/plugins/data/public';

import { AnnotationRow } from './annotation_row';
import { collectionActions, CollectionActionsProps } from './lib/collection_actions';

import type { Panel, Annotation } from '../../../common/types';
import type { VisFields } from '../lib/fetch_fields';

interface AnnotationsEditorProps {
  fields: VisFields;
  model: Panel;
  onChange: (partialModel: Partial<Panel>) => void;
  defaultIndexPattern?: IndexPattern;
}

export const newAnnotation = (defaultIndexPattern?: IndexPattern) => () => ({
  id: uuid.v1(),
  color: '#F00',
  index_pattern:
    defaultIndexPattern && defaultIndexPattern.id ? { id: defaultIndexPattern.id } : '',
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
    <EuiButton fill onClick={handleAdd} data-test-subj="addDataSourceButton">
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
  } as CollectionActionsProps<Panel>);

export const AnnotationsEditor = (props: AnnotationsEditorProps) => {
  const { annotations } = props.model;

  const handleAdd = useCallback(
    () =>
      collectionActions.handleAdd(
        getCollectionActionsProps(props),
        newAnnotation(props.defaultIndexPattern)
      ),
    [props]
  );

  const handleDelete = useCallback(
    (annotation) => () =>
      collectionActions.handleDelete(getCollectionActionsProps(props), annotation),
    [props]
  );

  const onChange = useCallback(
    (annotation: Annotation) => {
      return (part: Partial<Annotation>) =>
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
          {annotations.map((annotation) => (
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
