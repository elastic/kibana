/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiSelect,
  EuiText,
  EuiTextArea,
  EuiTitle,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { DataView } from '@kbn/data-views-plugin/common';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { SavedObjectsTaggingApiUiComponent } from '@kbn/saved-objects-tagging-oss-plugin/public';
import { euiThemeVars } from '@kbn/ui-theme';
import { QueryInputServices } from '@kbn/visualization-ui-components';
import React, { useCallback, useMemo } from 'react';
import type {
  EventAnnotationConfig,
  EventAnnotationGroupConfig,
} from '@kbn/event-annotation-common';
import {
  EVENT_ANNOTATION_APP_NAME,
  AnnotationEditorControls,
} from '@kbn/event-annotation-components';
import { AnnotationList } from './annotation_list';

const isTitleValid = (title: string) => Boolean(title.length);

const isDataViewValid = (dataView: DataView | undefined) => Boolean(dataView?.id);

export const isGroupValid = (group: EventAnnotationGroupConfig, dataViews: DataView[]) =>
  isTitleValid(group.title) &&
  isDataViewValid(dataViews.find(({ id }) => id === group.indexPatternId));

export const GroupEditorControls = ({
  group,
  update,
  setSelectedAnnotation: _setSelectedAnnotation,
  selectedAnnotation,
  TagSelector,
  dataViews,
  queryInputServices,
  showValidation,
  isAdHocDataView,
}: {
  group: EventAnnotationGroupConfig;
  update: (group: EventAnnotationGroupConfig) => void;
  selectedAnnotation: EventAnnotationConfig | undefined;
  setSelectedAnnotation: (annotation: EventAnnotationConfig) => void;
  TagSelector: SavedObjectsTaggingApiUiComponent['SavedObjectSaveModalTagSelector'];
  dataViews: DataView[];
  queryInputServices: QueryInputServices;
  showValidation: boolean;
  isAdHocDataView: (id: string) => boolean;
}) => {
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

  const currentDataView = useMemo(
    () => dataViews.find((dataView) => dataView.id === group.indexPatternId),
    [dataViews, group.indexPatternId]
  );

  return !selectedAnnotation ? (
    <>
      <EuiTitle
        size="xxs"
        css={css`
          margin-bottom: ${euiThemeVars.euiSize};
        `}
      >
        <h3>
          <FormattedMessage
            id="eventAnnotationListing.groupEditor.details"
            defaultMessage="Details"
          />
        </h3>
      </EuiTitle>
      <EuiForm>
        <EuiFormRow
          label={i18n.translate('eventAnnotationListing.groupEditor.title', {
            defaultMessage: 'Title',
          })}
          isInvalid={showValidation && !isTitleValid(group.title)}
          error={i18n.translate('eventAnnotationListing.groupEditor.titleRequired', {
            defaultMessage: 'A title is required.',
          })}
        >
          <EuiFieldText
            compressed
            data-test-subj="annotationGroupTitle"
            value={group.title}
            isInvalid={showValidation && !isTitleValid(group.title)}
            onChange={({ target: { value } }) =>
              update({
                ...group,
                title: value,
              })
            }
          />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate('eventAnnotationListing.groupEditor.description', {
            defaultMessage: 'Description',
          })}
          labelAppend={
            <EuiText color="subdued" size="xs">
              <FormattedMessage
                id="eventAnnotationListing.groupEditor.optional"
                defaultMessage="Optional"
              />
            </EuiText>
          }
        >
          <EuiTextArea
            compressed
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
            markOptional
            compressed
            onTagsSelected={(tags: string[]) =>
              update({
                ...group,
                tags,
              })
            }
          />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate('eventAnnotationListing.groupEditor.dataView', {
            defaultMessage: 'Data view',
          })}
          isInvalid={!isDataViewValid(currentDataView)}
          error={
            !isDataViewValid(currentDataView)
              ? i18n.translate('eventAnnotationListing.groupEditor.dataViewMissingError', {
                  defaultMessage: 'The previously selected data view no longer exists.',
                })
              : ''
          }
        >
          <EuiSelect
            compressed
            data-test-subj="annotationDataViewSelection"
            isInvalid={!isDataViewValid(currentDataView)}
            options={dataViews.map(({ id: value, title, name }) => ({
              value,
              text: name ?? title,
            }))}
            value={isDataViewValid(currentDataView) ? group.indexPatternId : undefined}
            hasNoInitialSelection={true}
            onChange={({ target: { value } }) => {
              const selectedDataView = dataViews.find(({ id }) => id === value);

              if (!selectedDataView?.id) {
                return;
              }

              update({
                ...group,
                indexPatternId: value,
                dataViewSpec: isAdHocDataView(selectedDataView.id)
                  ? selectedDataView.toSpec(false)
                  : undefined,
              });
            }}
          />
        </EuiFormRow>
      </EuiForm>
      <div
        css={css`
          margin-top: ${euiThemeVars.euiSize};
          padding-top: ${euiThemeVars.euiSize};
          position: relative;

          &:before {
            content: '';
            position: absolute;
            top: 0;
            right: -${euiThemeVars.euiSize};
            left: -${euiThemeVars.euiSize};
            border-top: 1px solid ${euiThemeVars.euiColorLightShade};
          }
        `}
      >
        <EuiTitle
          size="xxs"
          css={css`
            margin-bottom: ${euiThemeVars.euiSize};
          `}
        >
          <h3>
            <FormattedMessage
              id="eventAnnotationListing.groupEditor.annotations"
              defaultMessage="Annotations"
            />
          </h3>
        </EuiTitle>
        <EuiForm>
          <EuiFormRow
            label={i18n.translate('eventAnnotationListing.groupEditor.annotationGroupLabel', {
              defaultMessage: 'Date histogram axis',
            })}
          >
            <AnnotationList
              annotations={group.annotations}
              selectAnnotation={currentDataView ? setSelectedAnnotation : () => {}}
              update={(newAnnotations) => update({ ...group, annotations: newAnnotations })}
            />
          </EuiFormRow>
        </EuiForm>
      </div>
    </>
  ) : currentDataView ? (
    <AnnotationEditorControls
      annotation={selectedAnnotation}
      onAnnotationChange={(changes) => setSelectedAnnotation({ ...selectedAnnotation, ...changes })}
      dataView={currentDataView}
      getDefaultRangeEnd={(rangeStart) => rangeStart}
      queryInputServices={queryInputServices}
      appName={EVENT_ANNOTATION_APP_NAME}
    />
  ) : null;
};
