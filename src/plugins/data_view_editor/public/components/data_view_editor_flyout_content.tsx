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
import memoizeOne from 'memoize-one';
import { BehaviorSubject } from 'rxjs';
import useObservable from 'react-use/lib/useObservable';
import { INDEX_PATTERN_TYPE, MatchedItem } from '@kbn/data-views-plugin/public';

import {
  DataView,
  DataViewSpec,
  Form,
  useForm,
  useFormData,
  useKibana,
  UseField,
} from '../shared_imports';

import { ensureMinimumTime, getMatchedIndices } from '../lib';
import { FlyoutPanels } from './flyout_panels';

import { removeSpaces } from '../lib';

import {
  DataViewEditorContext,
  RollupIndicesCapsResponse,
  IndexPatternConfig,
  MatchedIndicesSet,
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
  requireTimestampField?: boolean;
  editData?: DataView;
  showManagementLink?: boolean;
  allowAdHoc: boolean;
}

export const matchedIndiciesDefault = {
  allIndices: [],
  exactMatchedIndices: [],
  partialMatchedIndices: [],
  visibleIndices: [],
};

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

      const rollupIndicesCapabilities = dataViewEditorService.rollupIndicesCapabilities$.getValue();

      const indexPatternStub: DataViewSpec = {
        title: removeSpaces(formData.title),
        timeFieldName: formData.timestampField?.value,
        id: formData.id,
        name: formData.name,
      };
      const rollupIndex = rollupIndex$.current.getValue();

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
  ] = useFormData<FormInternal>({ form });

  const currentLoadingMatchedIndicesRef = useRef(0);

  const isLoadingSources = useObservable(dataViewEditorService.isLoadingSources$, true);

  const loadingMatchedIndices$ = useRef(new BehaviorSubject<boolean>(false));

  const isLoadingDataViewNames$ = useRef(new BehaviorSubject<boolean>(true));
  const existingDataViewNames$ = useRef(new BehaviorSubject<string[]>([]));
  const isLoadingDataViewNames = useObservable(isLoadingDataViewNames$.current, true);

  const rollupIndicesCapabilities = useObservable(
    dataViewEditorService.rollupIndicesCapabilities$,
    {}
  );

  const rollupIndex$ = useRef(new BehaviorSubject<string | undefined>(undefined));

  // initial loading of indicies and data view names
  useEffect(() => {
    let isCancelled = false;
    const matchedIndicesSub = dataViewEditorService.matchedIndices$.subscribe((matchedIndices) => {
      const timeFieldQuery = editData ? editData.title : title;
      dataViewEditorService.loadTimestampFields(
        removeSpaces(timeFieldQuery),
        type,
        requireTimestampField,
        rollupIndex$.current.getValue()
      );
    });

    dataViewEditorService.loadIndices(title, allowHidden).then((matchedIndices) => {
      if (isCancelled) return;
      dataViewEditorService.matchedIndices$.next(matchedIndices);
    });

    dataViewEditorService.loadDataViewNames(title).then((names) => {
      if (isCancelled) return;
      const filteredNames = editData ? names.filter((name) => name !== editData?.name) : names;
      existingDataViewNames$.current.next(filteredNames);
      isLoadingDataViewNames$.current.next(false);
    });

    return () => {
      isCancelled = true;
      matchedIndicesSub.unsubscribe();
    };
  }, [editData, type, title, allowHidden, requireTimestampField, dataViewEditorService]);

  const getRollupIndices = (rollupCaps: RollupIndicesCapsResponse) => Object.keys(rollupCaps);

  // used in title field validation
  const reloadMatchedIndices = useCallback(
    async (newTitle: string) => {
      let newRollupIndexName: string | undefined;

      const fetchIndices = async (query: string = '') => {
        const currentLoadingMatchedIndicesIdx = ++currentLoadingMatchedIndicesRef.current;

        loadingMatchedIndices$.current.next(true);

        const allSrcs = await dataViewEditorService.getIndicesCached({
          pattern: '*',
          showAllIndices: allowHidden,
        });

        const { matchedIndicesResult, exactMatched } = !isLoadingSources
          ? await loadMatchedIndices(query, allowHidden, allSrcs, dataViewEditorService)
          : {
              matchedIndicesResult: matchedIndiciesDefault,
              exactMatched: [],
            };

        if (currentLoadingMatchedIndicesIdx === currentLoadingMatchedIndicesRef.current) {
          // we are still interested in this result
          if (type === INDEX_PATTERN_TYPE.ROLLUP) {
            const isRollupIndex = await dataViewEditorService.getIsRollupIndex();
            const rollupIndices = exactMatched.filter((index) => isRollupIndex(index.name));
            newRollupIndexName = rollupIndices.length === 1 ? rollupIndices[0].name : undefined;
            rollupIndex$.current.next(newRollupIndexName);
          } else {
            rollupIndex$.current.next(undefined);
          }

          dataViewEditorService.matchedIndices$.next(matchedIndicesResult);
          loadingMatchedIndices$.current.next(false);
        }

        return { matchedIndicesResult, newRollupIndexName };
      };

      return fetchIndices(newTitle);
    },
    [
      allowHidden,
      type,
      dataViewEditorService,
      rollupIndex$,
      isLoadingSources,
      loadingMatchedIndices$,
    ]
  );

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
              defaultMessage: 'View on data view management page',
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
                refreshMatchedIndices={reloadMatchedIndices}
                matchedIndices$={dataViewEditorService.matchedIndices$}
                rollupIndicesCapabilities={rollupIndicesCapabilities}
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

// loadMatchedIndices is called both as an side effect inside of a parent component and the inside forms validation functions
// that are challenging to synchronize without a larger refactor
// Use memoizeOne as a caching layer to avoid excessive network requests on each key type
// TODO: refactor to remove `memoize` when https://github.com/elastic/kibana/pull/109238 is done
const loadMatchedIndices = memoizeOne(
  async (
    query: string,
    allowHidden: boolean,
    allSources: MatchedItem[],
    dataViewEditorService: DataViewEditorService
  ): Promise<{
    matchedIndicesResult: MatchedIndicesSet;
    exactMatched: MatchedItem[];
    partialMatched: MatchedItem[];
  }> => {
    const indexRequests = [];

    if (query?.endsWith('*')) {
      const exactMatchedQuery = dataViewEditorService.getIndicesCached({
        pattern: query,
        showAllIndices: allowHidden,
      });
      indexRequests.push(exactMatchedQuery);
      // provide default value when not making a request for the partialMatchQuery
      indexRequests.push(Promise.resolve([]));
    } else {
      const exactMatchQuery = dataViewEditorService.getIndicesCached({
        pattern: query,
        showAllIndices: allowHidden,
      });
      const partialMatchQuery = dataViewEditorService.getIndicesCached({
        pattern: `${query}*`,
        showAllIndices: allowHidden,
      });

      indexRequests.push(exactMatchQuery);
      indexRequests.push(partialMatchQuery);
    }

    const [exactMatched, partialMatched] = (await ensureMinimumTime(
      indexRequests
    )) as MatchedItem[][];

    const matchedIndicesResult = getMatchedIndices(
      allSources,
      partialMatched,
      exactMatched,
      allowHidden
    );

    return { matchedIndicesResult, exactMatched, partialMatched };
  },
  // compare only query and allowHidden
  (newArgs, oldArgs) => newArgs[0] === oldArgs[0] && newArgs[1] === oldArgs[1]
);
