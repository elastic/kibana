/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useEffect, useCallback, useMemo, ChangeEvent } from 'react';
import { i18n } from '@kbn/i18n';
import uuid from 'uuid';
import {
  EuiCode,
  EuiComboBoxOptionOption,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
  htmlIdGenerator,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

import { AddDeleteButtons } from './add_delete_buttons';
import { ColorPicker } from './color_picker';
import { FieldSelect } from './aggs/field_select';
// @ts-expect-error not typed yet
import { IconSelect } from './icon_select/icon_select';
import { IndexPatternSelect } from './lib/index_pattern_select';
import { KBN_FIELD_TYPES, Query } from '../../../../../plugins/data/public';
import { QueryBarWrapper } from './query_bar_wrapper';
import { YesNo } from './yes_no';
import { collectionActions } from './lib/collection_actions';
import { fetchIndexPattern } from '../../../common/index_patterns_utils';
import { getDataStart } from '../../services';
import { getDefaultQueryLanguage } from './lib/get_default_query_language';
import type {
  Panel,
  Annotation,
  FetchedIndexPattern,
  IndexPatternValue,
} from '../../../common/types';
import type { VisFields } from '../lib/fetch_fields';

const RESTRICT_FIELDS = [KBN_FIELD_TYPES.DATE];
const INDEX_PATTERN_NAME = 'index_pattern';

export const newAnnotation = () => ({
  id: uuid.v1(),
  color: '#F00',
  index_pattern: '',
  time_field: '',
  icon: 'fa-tag',
  ignore_global_filters: 1,
  ignore_panel_filters: 1,
});

const annotationDefaults = {
  fields: '',
  template: '',
  index_pattern: '',
  query_string: { query: '', language: getDefaultQueryLanguage() },
};

export interface AnnotationRowProps {
  annotation: Annotation;
  fields: VisFields;
  model: Panel;
  name: keyof Panel;
  onChange: (partialModel: Partial<Panel>) => void;
}

export const AnnotationRow = (props: AnnotationRowProps) => {
  const model = useMemo(() => ({ ...annotationDefaults, ...props.annotation }), [props.annotation]);

  const [fetchedIndex, setFetchedIndex] = useState<FetchedIndexPattern | null>(null);

  const updateFetchedIndex = useCallback(async (indexPatternValue: IndexPatternValue = '') => {
    const { indexPatterns } = getDataStart();
    setFetchedIndex(await fetchIndexPattern(indexPatternValue, indexPatterns));
  }, []);

  useEffect(() => {
    updateFetchedIndex(model.index_pattern);
  }, [model.index_pattern, updateFetchedIndex]);

  const handleChange = useCallback(
    (item: Annotation, name: string) => {
      return (event: Array<EuiComboBoxOptionOption<string>> | ChangeEvent<HTMLInputElement>) =>
        collectionActions.handleChange(props, {
          ...item,
          [name]: Array.isArray(event) ? event?.[0]?.value : event.target.value,
        });
    },
    [props]
  );
  const handleQueryChange = useCallback(
    (item: Annotation, filter: Query) =>
      collectionActions.handleChange(props, {
        ...item,
        query_string: filter,
      }),
    [props]
  );

  const onChange = useCallback(
    (part: Partial<Annotation>) => collectionActions.handleChange(props, { ...model, ...part }),
    [props, model]
  );

  const changeFetchedIndex = useCallback(
    async (index: { [INDEX_PATTERN_NAME]: IndexPatternValue }) => {
      onChange(index);
      await updateFetchedIndex(index[INDEX_PATTERN_NAME]);
    },
    [onChange, updateFetchedIndex]
  );

  const togglePanelActivation = useCallback(
    () =>
      onChange({
        hidden: !model.hidden,
      }),
    [model.hidden, onChange]
  );

  const htmlId = htmlIdGenerator(model.id);
  const handleAdd = useCallback(() => collectionActions.handleAdd(props, newAnnotation), [props]);
  const handleDelete = useCallback(() => collectionActions.handleDelete(props, model), [
    props,
    model,
  ]);

  return (
    <div className="tvbAnnotationsEditor" key={model.id}>
      <EuiFlexGroup responsive={false}>
        <EuiFlexItem grow={false}>
          <ColorPicker disableTrash={true} onChange={onChange} name="color" value={model.color} />
        </EuiFlexItem>

        <EuiFlexItem className="tvbAggRow__children">
          <EuiFlexGroup responsive={false} wrap={true} gutterSize="m">
            <EuiFlexItem>
              <IndexPatternSelect
                value={model.index_pattern}
                indexPatternName={INDEX_PATTERN_NAME}
                onChange={changeFetchedIndex}
                fetchedIndex={fetchedIndex}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <FieldSelect
                type={'time_field'}
                label={
                  <FormattedMessage
                    id="visTypeTimeseries.annotationsEditor.timeFieldLabel"
                    defaultMessage="Time field (required)"
                  />
                }
                restrict={RESTRICT_FIELDS}
                value={model.time_field}
                onChange={handleChange(model, 'time_field')}
                indexPattern={model.index_pattern}
                fields={props.fields}
              />
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiSpacer size="m" />

          <EuiFlexGroup responsive={false} wrap={true} gutterSize="m">
            <EuiFlexItem>
              <EuiFormRow
                id={htmlId('queryString')}
                label={
                  <FormattedMessage
                    id="visTypeTimeseries.annotationsEditor.queryStringLabel"
                    defaultMessage="Query string"
                  />
                }
                fullWidth
              >
                <QueryBarWrapper
                  query={{
                    language: model.query_string.language || getDefaultQueryLanguage(),
                    query: model.query_string.query || '',
                  }}
                  onChange={(query) => handleQueryChange(model, query)}
                  indexPatterns={[model.index_pattern]}
                />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFormRow
                label={i18n.translate(
                  'visTypeTimeseries.annotationsEditor.ignoreGlobalFiltersLabel',
                  {
                    defaultMessage: 'Ignore global filters?',
                  }
                )}
              >
                <YesNo
                  value={model.ignore_global_filters}
                  name="ignore_global_filters"
                  onChange={onChange}
                />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFormRow
                label={i18n.translate(
                  'visTypeTimeseries.annotationsEditor.ignorePanelFiltersLabel',
                  {
                    defaultMessage: 'Ignore panel filters?',
                  }
                )}
              >
                <YesNo
                  value={model.ignore_panel_filters}
                  name="ignore_panel_filters"
                  onChange={onChange}
                />
              </EuiFormRow>
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiSpacer size="m" />

          <EuiFlexGroup responsive={false} wrap={true} gutterSize="m">
            <EuiFlexItem>
              <EuiFormRow
                id={htmlId('icon')}
                label={
                  <FormattedMessage
                    id="visTypeTimeseries.annotationsEditor.iconLabel"
                    defaultMessage="Icon (required)"
                  />
                }
              >
                <IconSelect value={model.icon} onChange={handleChange(model, 'icon')} />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFormRow
                id={htmlId('fields')}
                label={
                  <FormattedMessage
                    id="visTypeTimeseries.annotationsEditor.fieldsLabel"
                    defaultMessage="Fields (required - comma separated paths)"
                  />
                }
                fullWidth
              >
                <EuiFieldText
                  onChange={handleChange(model, 'fields')}
                  value={model.fields}
                  fullWidth
                />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFormRow
                id={htmlId('rowTemplate')}
                label={
                  <FormattedMessage
                    id="visTypeTimeseries.annotationsEditor.rowTemplateLabel"
                    defaultMessage="Row template (required)"
                  />
                }
                helpText={
                  <span>
                    <FormattedMessage
                      id="visTypeTimeseries.annotationsEditor.rowTemplateHelpText"
                      defaultMessage="eg.{rowTemplateExample}"
                      values={{ rowTemplateExample: <EuiCode>{'{{field}}'}</EuiCode> }}
                    />
                  </span>
                }
                fullWidth
              >
                <EuiFieldText
                  onChange={handleChange(model, 'template')}
                  value={model.template}
                  fullWidth
                />
              </EuiFormRow>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <AddDeleteButtons
            onAdd={handleAdd}
            onDelete={handleDelete}
            togglePanelActivation={togglePanelActivation}
            isPanelActive={!model.hidden}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};
