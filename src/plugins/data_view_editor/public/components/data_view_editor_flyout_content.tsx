/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useCallback } from 'react';
import {
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiLoadingSpinner,
  EuiLink,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import useObservable from 'react-use/lib/useObservable';
import { INDEX_PATTERN_TYPE } from '@kbn/data-views-plugin/public';

import {
  DataView,
  DataViewSpec,
  Form,
  useForm,
  useFormData,
  useKibana,
  UseField,
} from '../shared_imports';

import { FlyoutPanels } from './flyout_panels';

import { removeSpaces } from '../lib';

import {
  DataViewEditorContext,
  RollupIndicesCapsResponse,
  IndexPatternConfig,
  FormInternal,
} from '../types';

import {
  TimestampField,
  TypeField,
  TitleField,
  NameField,
  schema,
  Footer,
  AdvancedParamsContent,
  PreviewPanel,
  RollupBetaWarning,
} from '.';
import { editDataViewModal } from './confirm_modals/edit_data_view_changed_modal';
import { DataViewEditorService } from '../data_view_editor_service';

export interface Props {
  /**
   * Handler for the "save" footer button
   */
  onSave: (dataViewSpec: DataViewSpec, persist: boolean) => void;
  /**
   * Handler for the "cancel" footer button
   */
  onCancel: () => void;
  defaultTypeIsRollup?: boolean;
  editData?: DataView;
  showManagementLink?: boolean;
  allowAdHoc: boolean;
  dataViewEditorService: DataViewEditorService;
}

const editorTitle = i18n.translate('indexPatternEditor.title', {
  defaultMessage: 'Create data view',
});

const editorTitleEditMode = i18n.translate('indexPatternEditor.titleEditMode', {
  defaultMessage: 'Edit data view',
});

const IndexPatternEditorFlyoutContentComponent = ({
  onSave,
  onCancel,
  defaultTypeIsRollup,
  editData,
  allowAdHoc,
  showManagementLink,
  dataViewEditorService,
}: Props) => {
  const {
    services: { application, dataViews, uiSettings, overlays },
  } = useKibana<DataViewEditorContext>();

  const canSave = dataViews.getCanSaveSync();

  const { form } = useForm<IndexPatternConfig, FormInternal>({
    // Prefill with data if editData exists
    defaultValue: {
      type: defaultTypeIsRollup ? INDEX_PATTERN_TYPE.ROLLUP : INDEX_PATTERN_TYPE.DEFAULT,
      isAdHoc: false,
      ...(editData
        ? {
            title: editData.getIndexPattern(),
            id: editData.id,
            name: editData.name,
            ...(editData.timeFieldName
              ? {
                  timestampField: { label: editData.timeFieldName, value: editData.timeFieldName },
                }
              : {}),
          }
        : {}),
    },
    schema,
    onSubmit: async (formData, isValid) => {
      if (!isValid) {
        return;
      }

      const indexPatternStub: DataViewSpec = {
        title: removeSpaces(formData.title),
        timeFieldName: formData.timestampField?.value,
        id: formData.id,
        name: formData.name,
      };

      if (type === INDEX_PATTERN_TYPE.ROLLUP && rollupIndex) {
        indexPatternStub.type = INDEX_PATTERN_TYPE.ROLLUP;
        indexPatternStub.typeMeta = {
          params: {
            rollup_index: rollupIndex,
          },
          aggs: rollupIndicesCapabilities[rollupIndex].aggs,
        };
      }

      if (editData && editData.getIndexPattern() !== formData.title) {
        editDataViewModal({
          dataViewName: formData.name || formData.title,
          overlays,
          onEdit: async () => {
            await onSave(indexPatternStub, !formData.isAdHoc);
          },
        });
      } else {
        await onSave(indexPatternStub, !formData.isAdHoc);
      }
    },
  });

  // `useFormData` initially returns `undefined`,
  // we override `undefined` with real default values from `schema`
  // to get a stable reference to avoid hooks re-run and reduce number of excessive requests
  const [
    {
      title = schema.title.defaultValue,
      allowHidden = schema.allowHidden.defaultValue,
      type = schema.type.defaultValue,
    },
  ] = useFormData<FormInternal>({
    form,
  });

  const isLoadingSources = useObservable(dataViewEditorService.isLoadingSources$, true);
  const existingDataViewNames = useObservable(dataViewEditorService.dataViewNames$);
  const rollupIndex = useObservable(dataViewEditorService.rollupIndex$);
  const rollupIndicesCapabilities = useObservable(dataViewEditorService.rollupIndicesCaps$, {});

  useEffect(() => {
    dataViewEditorService.setIndexPattern(title);
  }, [dataViewEditorService, title]);

  useEffect(() => {
    dataViewEditorService.setAllowHidden(allowHidden);
  }, [dataViewEditorService, allowHidden]);

  useEffect(() => {
    dataViewEditorService.setType(type);
  }, [dataViewEditorService, type]);

  const getRollupIndices = (rollupCaps: RollupIndicesCapsResponse) => Object.keys(rollupCaps);

  const onTypeChange = useCallback(
    (newType) => {
      form.setFieldValue('title', '');
      form.setFieldValue('name', '');
      form.setFieldValue('timestampField', '');
      if (newType === INDEX_PATTERN_TYPE.ROLLUP) {
        form.setFieldValue('allowHidden', false);
      }
    },
    [form]
  );

  if (isLoadingSources || !existingDataViewNames) {
    return <EuiLoadingSpinner size="xl" />;
  }

  const showIndexPatternTypeSelect = () =>
    uiSettings.isDeclared('rollups:enableIndexPatterns') &&
    uiSettings.get('rollups:enableIndexPatterns') &&
    getRollupIndices(rollupIndicesCapabilities).length;

  const indexPatternTypeSelect = showIndexPatternTypeSelect() ? (
    <>
      <EuiSpacer size="l" />
      <EuiFlexGroup>
        <EuiFlexItem>
          <TypeField onChange={onTypeChange} />
        </EuiFlexItem>
      </EuiFlexGroup>
      {type === INDEX_PATTERN_TYPE.ROLLUP ? (
        <EuiFlexGroup>
          <EuiFlexItem>
            <RollupBetaWarning />
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : (
        <></>
      )}
    </>
  ) : (
    <></>
  );

  return (
    <FlyoutPanels.Group flyoutClassName={'indexPatternEditorFlyout'} maxWidth={1180}>
      <FlyoutPanels.Item className="fieldEditor__mainFlyoutPanel" border="right">
        <EuiTitle data-test-subj="flyoutTitle">
          <h2>{editData ? editorTitleEditMode : editorTitle}</h2>
        </EuiTitle>
        {showManagementLink && editData && editData.id && (
          <EuiLink
            href={application.getUrlForApp('management', {
              path: `/kibana/dataViews/dataView/${editData.id}`,
            })}
          >
            {i18n.translate('indexPatternEditor.goToManagementPage', {
              defaultMessage: 'Manage settings and view field details',
            })}
          </EuiLink>
        )}
        <Form
          form={form}
          className="indexPatternEditor__form"
          error={form.getErrors()}
          isInvalid={form.isSubmitted && !form.isValid && form.getErrors().length}
        >
          <UseField path="isAdHoc" />
          {indexPatternTypeSelect}
          <EuiSpacer size="l" />
          <EuiFlexGroup>
            <EuiFlexItem>
              <NameField namesNotAllowed={existingDataViewNames || []} />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="l" />
          <EuiFlexGroup>
            <EuiFlexItem>
              <TitleField
                isRollup={form.getFields().type?.value === INDEX_PATTERN_TYPE.ROLLUP}
                matchedIndices$={dataViewEditorService.matchedIndices$}
                rollupIndicesCapabilities={rollupIndicesCapabilities}
                indexPatternValidationProvider={
                  dataViewEditorService.indexPatternValidationProvider
                }
              />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="l" />
          <EuiFlexGroup>
            <EuiFlexItem>
              <TimestampField
                options$={dataViewEditorService.timestampFieldOptions$}
                isLoadingOptions$={dataViewEditorService.loadingTimestampFields$}
                matchedIndices$={dataViewEditorService.matchedIndices$}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
          <AdvancedParamsContent
            disableAllowHidden={type === INDEX_PATTERN_TYPE.ROLLUP}
            disableId={!!editData}
            onAllowHiddenChange={() => {
              form.getFields().title.validate();
            }}
          />
        </Form>
        <Footer
          onCancel={onCancel}
          onSubmit={async (adhoc?: boolean) => {
            const formData = form.getFormData();
            if (!formData.name) {
              form.updateFieldValues({ name: formData.title });
              await form.getFields().name.validate();
            }
            form.setFieldValue('isAdHoc', adhoc || false);
            form.submit();
          }}
          submitDisabled={form.isSubmitted && !form.isValid}
          isEdit={!!editData}
          isPersisted={Boolean(editData && editData.isPersisted())}
          allowAdHoc={allowAdHoc}
          canSave={canSave}
        />
      </FlyoutPanels.Item>
      <FlyoutPanels.Item>
        {isLoadingSources ? (
          <></>
        ) : (
          <PreviewPanel
            type={type}
            allowHidden={allowHidden}
            title={title}
            matchedIndices$={dataViewEditorService.matchedIndices$}
          />
        )}
      </FlyoutPanels.Item>
    </FlyoutPanels.Group>
  );
};

export const IndexPatternEditorFlyoutContent = React.memo(IndexPatternEditorFlyoutContentComponent);
