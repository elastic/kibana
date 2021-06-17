/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/*
 * Copyright Elasticsearch B.V. and/o licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useEffect, ChangeEvent } from 'react';
import { i18n } from '@kbn/i18n';
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
import type { Annotation, FetchedIndexPattern, IndexPatternValue } from '../../../common/types';
import type { AnnotationsEditorProps } from './annotations_editor';
import { newAnnotation } from './annotations_editor';

const RESTRICT_FIELDS = [KBN_FIELD_TYPES.DATE];
const INDEX_PATTERN_NAME = 'index_pattern';

const annotationDefaults = {
  fields: '',
  template: '',
  index_pattern: '',
  query_string: { query: '', language: getDefaultQueryLanguage() },
};

interface AnnotationRowProps extends AnnotationsEditorProps {
  annotation: Annotation;
}

export const AnnotationRow = (props: AnnotationRowProps) => {
  const model = { ...annotationDefaults, ...props.annotation };
  const collectionActionProps = { model: props.model, name: props.name, onChange: props.onChange };

  const [fetchedIndex, setFetchedIndex] = useState<FetchedIndexPattern | null>(null);

  const updateFetchedIndex = async (indexPatternValue: IndexPatternValue = '') => {
    const { indexPatterns } = getDataStart();
    setFetchedIndex(await fetchIndexPattern(indexPatternValue, indexPatterns));
  };

  useEffect(() => {
    updateFetchedIndex(model.index_pattern);
  }, [model.index_pattern]);

  const handleChange = (item: Annotation, name: string) => {
    return (event: Array<EuiComboBoxOptionOption<string>> | ChangeEvent<HTMLInputElement>) =>
      collectionActions.handleChange(collectionActionProps, {
        ...item,
        [name]: Array.isArray(event) ? event?.[0]?.value : event.target.value,
      });
  };
  const handleQueryChange = (item: Annotation, filter: Query) =>
    collectionActions.handleChange(collectionActionProps, {
      ...item,
      query_string: filter,
    });

  const onChange = (part: Partial<Annotation>) =>
    collectionActions.handleChange(collectionActionProps, { ...model, ...part });

  const changeFetchedIndex = async (index: { [INDEX_PATTERN_NAME]: IndexPatternValue }) => {
    onChange(index);
    await updateFetchedIndex(index[INDEX_PATTERN_NAME]);
  };

  const togglePanelActivation = () =>
    onChange({
      hidden: !model.hidden,
    });

  const htmlId = htmlIdGenerator(model.id);
  const handleAdd = () => collectionActions.handleAdd(collectionActionProps, newAnnotation);
  const handleDelete = () => collectionActions.handleDelete(collectionActionProps, model);

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
