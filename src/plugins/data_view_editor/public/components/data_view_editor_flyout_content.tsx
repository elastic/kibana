/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useCallback, useRef, useContext } from 'react';
import {
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiLoadingSpinner,
  EuiLink,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { BehaviorSubject, Subject } from 'rxjs';
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
import { DataViewEditorServiceContext } from './data_view_flyout_content_container';

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
  requireTimestampField?: boolean;
  editData?: DataView;
  showManagementLink?: boolean;
  allowAdHoc: boolean;
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
  requireTimestampField = false,
  editData,
  allowAdHoc,
  showManagementLink,
}: Props) => {
  const {
    services: { application, dataViews, uiSettings, overlays },
  } = useKibana<DataViewEditorContext>();

  const { dataViewEditorService } = useContext(DataViewEditorServiceContext);

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

      // todo see if I can reduce getValue usage
      // todo export asObservable references instead of full subjects
      const rollupIndicesCapabilities = dataViewEditorService.rollupIndicesCapabilities$.getValue();

      const indexPatternStub: DataViewSpec = {
        title: removeSpaces(formData.title),
        timeFieldName: formData.timestampField?.value,
        id: formData.id,
        name: formData.name,
      };
      const rollupIndex = dataViewEditorService.rollupIndex$.getValue();

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

  const onChange = useCallback(() => {
    newItem$.current.next(undefined);
  }, []);

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
    onChange,
  });

  const isLoadingSources = useObservable(dataViewEditorService.isLoadingSources$, true);

  const loadingMatchedIndices$ = useRef(new BehaviorSubject<boolean>(false));

  const isLoadingDataViewNames$ = useRef(new BehaviorSubject<boolean>(true));
  const existingDataViewNames$ = useRef(new BehaviorSubject<string[]>([]));
  const isLoadingDataViewNames = useObservable(isLoadingDataViewNames$.current, true);
  const newItem$ = useRef(new Subject());

  const rollupIndicesCapabilities = useObservable(
    dataViewEditorService.rollupIndicesCapabilities$,
    {}
  );

  // this shouldn't be needed
  // const rollupIndex$ = useRef(new BehaviorSubject<string | undefined>(undefined));

  // could this be moved to the service?
  // initial loading of indicies and data view names
  useEffect(() => {
    let isCancelled = false;

    // subscribe to matches indices updates and update timestamp field options
    const matchedIndicesSub = dataViewEditorService.matchedIndices$.subscribe((matchedIndices) => {
      const timeFieldQuery = editData ? editData.getIndexPattern() : title;
      // might be a good idea to pass in matchedIndices, would make it a pure function
      dataViewEditorService.loadTimestampFields(
        removeSpaces(timeFieldQuery),
        type,
        requireTimestampField,
        // this can return null but we can treat it as undefined
        dataViewEditorService.rollupIndex$.getValue() || undefined
      );
    });

    // run loadMAtchedIndices on initial load
    // TODO THIS IS A BIT UNCLEAR
    // this is firing too much
    // ... should it load current matches?
    // todo - set title, alowHidden, type on service and have it do the right thing
    dataViewEditorService.loadIndices(title, allowHidden, type);

    // this should happen only on initial page load and should not change.
    // todo - see if this code can be removed
    dataViewEditorService.dataViewNames.then((names) => {
      if (isCancelled) return;
      existingDataViewNames$.current.next(names);
      isLoadingDataViewNames$.current.next(false);
    });

    return () => {
      isCancelled = true;
      matchedIndicesSub.unsubscribe();
    };
  }, [editData, type, title, allowHidden, requireTimestampField, dataViewEditorService]);

  // part of service?
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

  if (isLoadingSources || isLoadingDataViewNames) {
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
        <Form form={form} className="indexPatternEditor__form">
          <UseField path="isAdHoc" />
          {indexPatternTypeSelect}
          <EuiSpacer size="l" />
          <EuiFlexGroup>
            <EuiFlexItem>
              <NameField existingDataViewNames$={existingDataViewNames$.current} />
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
                isLoadingMatchedIndices$={loadingMatchedIndices$.current}
                matchedIndices$={dataViewEditorService.matchedIndices$}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
          <AdvancedParamsContent
            disableAllowHidden={type === INDEX_PATTERN_TYPE.ROLLUP}
            disableId={!!editData}
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
