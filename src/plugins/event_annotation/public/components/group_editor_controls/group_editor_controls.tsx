/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiFieldText, EuiForm, EuiFormRow, EuiSelect, EuiText, EuiTextArea } from '@elastic/eui';
import { css } from '@emotion/react';
import type { DataView, DataViewSpec } from '@kbn/data-views-plugin/common';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { SavedObjectsTaggingApiUiComponent } from '@kbn/saved-objects-tagging-oss-plugin/public';
import { euiThemeVars } from '@kbn/ui-theme';
import { QueryInputServices } from '@kbn/visualization-ui-components/public';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { EventAnnotationConfig, EventAnnotationGroupConfig } from '../../../common';
import { AnnotationEditorControls } from '../annotation_editor_controls';
import { AnnotationList } from './annotation_list';

export const ENABLE_INDIVIDUAL_ANNOTATION_EDITING = false;

export const GroupEditorControls = ({
  group,
  update,
  setSelectedAnnotation: _setSelectedAnnotation,
  selectedAnnotation,
  TagSelector,
  dataViews: globalDataViews,
  createDataView,
  queryInputServices,
}: {
  group: EventAnnotationGroupConfig;
  update: (group: EventAnnotationGroupConfig) => void;
  selectedAnnotation: EventAnnotationConfig | undefined;
  setSelectedAnnotation: (annotation: EventAnnotationConfig) => void;
  TagSelector: SavedObjectsTaggingApiUiComponent['SavedObjectSaveModalTagSelector'];
  dataViews: DataView[];
  createDataView: (spec: DataViewSpec) => Promise<DataView>;
  queryInputServices: QueryInputServices;
}) => {
  // save the spec for the life of the component since the user might change their mind after selecting another data view
  const [adHocDataView, setAdHocDataView] = useState<DataView>();

  useEffect(() => {
    if (group.dataViewSpec) {
      createDataView(group.dataViewSpec).then(setAdHocDataView);
    }
  }, [createDataView, group.dataViewSpec]);

  const setSelectedAnnotation = useCallback(
    (newSelection: EventAnnotationConfig) => {
      update({
        ...group,
        annotations: group.annotations.map((annotation) =>
          annotation.id === newSelection.id ? newSelection : annotation
        ),
      });
      _setSelectedAnnotation(newSelection);
    },
    [_setSelectedAnnotation, group, update]
  );

  const dataViews = useMemo(() => {
    const items = [...globalDataViews];
    if (adHocDataView) {
      items.push(adHocDataView);
    }
    return items;
  }, [adHocDataView, globalDataViews]);

  const currentDataView = useMemo(
    () => dataViews.find((dataView) => dataView.id === group.indexPatternId) || dataViews[0],
    [dataViews, group.indexPatternId]
  );

  return !selectedAnnotation ? (
    <>
      <EuiText
        size="s"
        css={css`
          margin-bottom: ${euiThemeVars.euiSize};
        `}
      >
        <h4>
          <FormattedMessage id="eventAnnotation.groupEditor.details" defaultMessage="Details" />
        </h4>
      </EuiText>
      <EuiForm>
        <EuiFormRow
          label={i18n.translate('eventAnnotation.groupEditor.title', {
            defaultMessage: 'Title',
          })}
        >
          <EuiFieldText
            data-test-subj="annotationGroupTitle"
            value={group.title}
            onChange={({ target: { value } }) =>
              update({
                ...group,
                title: value,
              })
            }
          />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate('eventAnnotation.groupEditor.description', {
            defaultMessage: 'Description',
          })}
        >
          <EuiTextArea
            data-test-subj="annotationGroupDescription"
            value={group.description}
            onChange={({ target: { value } }) =>
              update({
                ...group,
                description: value,
              })
            }
          />
        </EuiFormRow>
        <EuiFormRow>
          <TagSelector
            initialSelection={group.tags}
            onTagsSelected={(tags: string[]) =>
              update({
                ...group,
                tags,
              })
            }
          />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate('eventAnnotation.groupEditor.dataView', {
            defaultMessage: 'Data view',
          })}
        >
          <EuiSelect
            data-test-subj="annotationDataViewSelection"
            options={dataViews.map(({ id: value, title, name }) => ({
              value,
              text: name ?? title,
            }))}
            value={group.indexPatternId}
            onChange={({ target: { value } }) =>
              update({
                ...group,
                indexPatternId: value,
                dataViewSpec: value === adHocDataView?.id ? adHocDataView.toSpec(false) : undefined,
              })
            }
          />
        </EuiFormRow>
        {ENABLE_INDIVIDUAL_ANNOTATION_EDITING && (
          <EuiFormRow
            label={i18n.translate('eventAnnotation.groupEditor.addAnnotation', {
              defaultMessage: 'Annotations',
            })}
          >
            <AnnotationList
              annotations={group.annotations}
              selectAnnotation={setSelectedAnnotation}
              update={(newAnnotations) => update({ ...group, annotations: newAnnotations })}
            />
          </EuiFormRow>
        )}
      </EuiForm>
    </>
  ) : (
    <AnnotationEditorControls
      annotation={selectedAnnotation}
      onAnnotationChange={(changes) => setSelectedAnnotation({ ...selectedAnnotation, ...changes })}
      dataView={currentDataView}
      getDefaultRangeEnd={(rangeStart) => rangeStart}
      queryInputServices={queryInputServices}
    />
  );
};
