/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, useEffect, useCallback, useMemo, ChangeEvent } from 'react';
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
  useEuiTheme,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import type { Query } from '@kbn/es-query';
import { KBN_FIELD_TYPES } from '@kbn/data-plugin/public';
import { getDataViewsStart } from '../../services';

import { AddDeleteButtons } from './add_delete_buttons';
import { ColorPicker } from './color_picker';
import { FieldSelect } from './aggs/field_select';
import { IndexPatternSelect, IndexPatternSelectProps } from './lib/index_pattern_select';
import { QueryBarWrapper } from './query_bar_wrapper';
import { YesNo } from './yes_no';
import {
  fetchIndexPattern,
  isDataViewTypeIndexPattern,
} from '../../../common/index_patterns_utils';
import { getDefaultQueryLanguage } from './lib/get_default_query_language';

import { IconSelect } from './icon_select/icon_select';

import type { Annotation, IndexPatternValue } from '../../../common/types';
import type { VisFields } from '../lib/fetch_fields';
import { aggRowChildrenStyles } from '../styles/common.styles';

const RESTRICT_FIELDS = [KBN_FIELD_TYPES.DATE];

const INDEX_PATTERN_KEY = 'index_pattern';
const TIME_FIELD_KEY = 'time_field';

export interface AnnotationRowProps {
  annotation: Annotation;
  fields: VisFields;
  onChange: (partialModel: Partial<Annotation>) => void;
  handleAdd: () => void;
  handleDelete: () => void;
}

const getAnnotationDefaults = () => ({
  fields: '',
  template: '',
  index_pattern: '',
  query_string: { query: '', language: getDefaultQueryLanguage() },
});

export const AnnotationRow = ({
  annotation,
  fields,
  onChange,
  handleAdd,
  handleDelete,
}: AnnotationRowProps) => {
  const model = useMemo(() => ({ ...getAnnotationDefaults(), ...annotation }), [annotation]);
  const htmlId = htmlIdGenerator(model.id);

  const [fetchedIndex, setFetchedIndex] = useState<IndexPatternSelectProps['fetchedIndex']>(null);

  const { euiTheme } = useEuiTheme();

  useEffect(() => {
    const updateFetchedIndex = async (index: IndexPatternValue) => {
      const dataViews = getDataViewsStart();
      let fetchedIndexPattern: IndexPatternSelectProps['fetchedIndex'] = {
        indexPattern: undefined,
        indexPatternString: undefined,
      };

      try {
        fetchedIndexPattern = index
          ? await fetchIndexPattern(index, dataViews, {
              fetchKibanaIndexForStringIndexes: true,
            })
          : {
              ...fetchedIndexPattern,
              defaultIndex: await dataViews.getDefault(),
            };
      } catch {
        if (isDataViewTypeIndexPattern(index)) {
          fetchedIndexPattern.missedIndex = index.id;
        }
      }

      setFetchedIndex(fetchedIndexPattern);
    };

    updateFetchedIndex(model.index_pattern);
  }, [model.index_pattern]);

  const togglePanelActivation = useCallback(
    () =>
      onChange({
        hidden: !model.hidden,
      }),
    [model.hidden, onChange]
  );

  const handleChange = useCallback(
    (name: string) =>
      (event: Array<EuiComboBoxOptionOption<string>> | ChangeEvent<HTMLInputElement>) =>
        onChange({
          [name]: Array.isArray(event) ? event?.[0]?.value : event.target.value,
        }),
    [onChange]
  );

  const handleQueryChange = useCallback(
    (filter: Query) =>
      onChange({
        query_string: filter,
      }),
    [onChange]
  );

  return (
    <div className="tvbAnnotationsEditor" key={model.id}>
      <EuiFlexGroup responsive={false}>
        <EuiFlexItem grow={false}>
          <ColorPicker disableTrash={true} onChange={onChange} name="color" value={model.color} />
        </EuiFlexItem>

        <EuiFlexItem css={aggRowChildrenStyles(euiTheme)}>
          <EuiFlexGroup responsive={false} wrap={true} gutterSize="m">
            <EuiFlexItem>
              <IndexPatternSelect
                indexPatternName={INDEX_PATTERN_KEY}
                onChange={onChange}
                fetchedIndex={fetchedIndex}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <FieldSelect
                type={TIME_FIELD_KEY}
                label={
                  <FormattedMessage
                    id="visTypeTimeseries.annotationsEditor.timeFieldLabel"
                    defaultMessage="Time field"
                  />
                }
                restrict={RESTRICT_FIELDS}
                value={model[TIME_FIELD_KEY]}
                onChange={(value) =>
                  onChange({
                    [TIME_FIELD_KEY]: value?.[0] ?? undefined,
                  })
                }
                indexPattern={model.index_pattern}
                placeholder={
                  fetchedIndex?.indexPattern?.timeFieldName ??
                  fetchedIndex?.defaultIndex?.timeFieldName
                }
                fields={fields}
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
                  onChange={handleQueryChange}
                  indexPatterns={[model.index_pattern]}
                  data-test-subj="annotationQueryBar"
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
                <IconSelect value={model.icon} onChange={handleChange('icon')} />
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
                  onChange={handleChange('fields')}
                  value={model.fields}
                  fullWidth
                  data-test-subj="annotationFieldsInput"
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
                  onChange={handleChange('template')}
                  value={model.template}
                  fullWidth
                  data-test-subj="annotationRowTemplateInput"
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
