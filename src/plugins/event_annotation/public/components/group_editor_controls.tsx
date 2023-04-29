/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EuiButton,
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTextArea,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { DataViewListItem, DataViewSpec } from '@kbn/data-views-plugin/common';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { SavedObjectsTaggingApi } from '@kbn/saved-objects-tagging-oss-plugin/public';
import React, { useMemo, useState } from 'react';
import { EventAnnotationConfig, EventAnnotationGroupConfig } from '../../common';
import { AnnotationsPanel } from './annotations_config_panel';

export const GroupEditorControls = ({
  group,
  update,
  setSelectedAnnotation,
  selectedAnnotation,
  savedObjectsTagging,
  dataViewListItems: globalDataViewListItems,
}: {
  group: EventAnnotationGroupConfig;
  update: (group: EventAnnotationGroupConfig) => void;
  selectedAnnotation: EventAnnotationConfig | undefined;
  setSelectedAnnotation: (annotation: EventAnnotationConfig) => void;
  savedObjectsTagging: SavedObjectsTaggingApi;
  dataViewListItems: DataViewListItem[];
}) => {
  const { euiTheme } = useEuiTheme();

  // save the spec for the life of the component since the user might change their mind after selecting another data view
  const [adHocDataViewSpec] = useState<DataViewSpec | undefined>(group.dataViewSpec);

  const dataViewListItems = useMemo(() => {
    const items = [...globalDataViewListItems];
    if (adHocDataViewSpec) {
      const { id, name, title } = adHocDataViewSpec;
      const adHocListItem: DataViewListItem = {
        id: id!,
        title: name ?? title!,
      };
      items.push(adHocListItem);
    }
    return items;
  }, [adHocDataViewSpec, globalDataViewListItems]);

  return !selectedAnnotation ? (
    <>
      <EuiText
        size="s"
        css={css`
          margin-bottom: ${euiTheme.size.base};
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
          <savedObjectsTagging.ui.components.SavedObjectSaveModalTagSelector
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
            options={dataViewListItems.map(({ id: value, title, name }) => ({
              value,
              text: name ?? title,
            }))}
            value={group.indexPatternId}
            onChange={({ target: { value } }) =>
              update({
                ...group,
                indexPatternId: value,
                dataViewSpec: value === adHocDataViewSpec?.id ? adHocDataViewSpec : undefined,
              })
            }
          />
        </EuiFormRow>
        <EuiFormRow label="Annotations">
          <div>
            {group.annotations.map((annotation) => (
              <>
                <EuiButton fullWidth onClick={() => setSelectedAnnotation(annotation)}>
                  {annotation.label}
                </EuiButton>
                <EuiSpacer size="s" />
              </>
            ))}
          </div>
        </EuiFormRow>
      </EuiForm>
    </>
  ) : (
    <AnnotationsPanel
      annotation={selectedAnnotation}
      onAnnotationChange={(changes) => setSelectedAnnotation({ ...selectedAnnotation, ...changes })}
    />
  );
};
