/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useCallback, useRef } from 'react';
import { EuiTitle, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiLoadingSpinner } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import memoizeOne from 'memoize-one';
import { BehaviorSubject, Subject } from 'rxjs';
import useObservable from 'react-use/lib/useObservable';
import {
  DataViewField,
  DataViewsPublicPluginStart,
  INDEX_PATTERN_TYPE,
  MatchedItem,
} from '@kbn/data-views-plugin/public';

import {
  DataView,
  DataViewSpec,
  Form,
  useForm,
  useFormData,
  useKibana,
  GetFieldsOptions,
  UseField,
} from '../shared_imports';

import { ensureMinimumTime, extractTimeFields, getMatchedIndices } from '../lib';
import { FlyoutPanels } from './flyout_panels';

import { removeSpaces } from '../lib';

import {
  DataViewEditorContext,
  RollupIndicesCapsResponse,
  IndexPatternConfig,
  MatchedIndicesSet,
  FormInternal,
  TimestampOption,
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
}: Props) => {
  const {
    services: { http, dataViews, uiSettings, overlays },
  } = useKibana<DataViewEditorContext>();

  const { form } = useForm<IndexPatternConfig, FormInternal>({
    // Prefill with data if editData exists
    defaultValue: {
      type: defaultTypeIsRollup ? INDEX_PATTERN_TYPE.ROLLUP : INDEX_PATTERN_TYPE.DEFAULT,
      isAdHoc: false,
      ...(editData
        ? {
            title: editData.title,
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
      const rollupIndex = rollupIndex$.current.getValue();

      if (type === INDEX_PATTERN_TYPE.ROLLUP && rollupIndex) {
        indexPatternStub.type = INDEX_PATTERN_TYPE.ROLLUP;
        indexPatternStub.typeMeta = {
          params: {
            rollup_index: rollupIndex,
          },
          aggs: rollupIndicesCapabilities$.current.getValue()[rollupIndex].aggs,
        };
      }

      if (editData && editData.title !== formData.title) {
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

  const currentLoadingTimestampFieldsRef = useRef(0);
  const currentLoadingMatchedIndicesRef = useRef(0);

  const isLoadingSources$ = useRef(new BehaviorSubject<boolean>(true));
  const isLoadingSources = useObservable(isLoadingSources$.current, true);

  const loadingTimestampFields$ = useRef(new BehaviorSubject<boolean>(false));
  const timestampFieldOptions$ = useRef(new Subject<TimestampOption[]>());

  const loadingMatchedIndices$ = useRef(new BehaviorSubject<boolean>(false));
  const matchedIndices$ = useRef(new Subject<MatchedIndicesSet>());

  const isLoadingDataViewNames$ = useRef(new BehaviorSubject<boolean>(true));
  const existingDataViewNames$ = useRef(new BehaviorSubject<string[]>([]));
  const isLoadingDataViewNames = useObservable(isLoadingDataViewNames$.current, true);

  // review rollup observables
  const rollupIndicesCapabilities$ = useRef(new BehaviorSubject<RollupIndicesCapsResponse>({}));
  const rollupIndicesCapabilities = useObservable(rollupIndicesCapabilities$.current, {});

  const rollupIndex$ = useRef(new BehaviorSubject<string | undefined>(undefined));

  const loadTimestampFields = useCallback(
    async (index: string) => {
      const currentLoadingTimestampFieldsIdx = ++currentLoadingTimestampFieldsRef.current;
      loadingTimestampFields$.current.next(true);
      const getFieldsOptions: GetFieldsOptions = {
        pattern: index,
      };
      if (type === INDEX_PATTERN_TYPE.ROLLUP) {
        getFieldsOptions.type = INDEX_PATTERN_TYPE.ROLLUP;
        getFieldsOptions.rollupIndex = rollupIndex$.current.getValue();
      }

      const fields = await ensureMinimumTime(dataViews.getFieldsForWildcard(getFieldsOptions));
      const timestampOptions = extractTimeFields(fields as DataViewField[], requireTimestampField);
      if (currentLoadingTimestampFieldsIdx === currentLoadingTimestampFieldsRef.current) {
        timestampFieldOptions$.current.next(timestampOptions);
        loadingTimestampFields$.current.next(false);
      }
    },
    [
      dataViews,
      requireTimestampField,
      type,
      rollupIndex$,
      loadingTimestampFields$,
      timestampFieldOptions$,
    ]
  );

  const getIsRollupIndex = useCallback(async () => {
    let response: RollupIndicesCapsResponse = {};
    try {
      response = await http.get<RollupIndicesCapsResponse>('/api/rollup/indices');
    } catch (e) {
      // Silently swallow failure responses such as expired trials
    }
    return (indexName: string) => getRollupIndices(response).includes(indexName);
  }, [http]);

  const loadIndices = useCallback(async () => {
    const isRollupIndex = await getIsRollupIndex();
    const allSrcs = await dataViews.getIndices({
      isRollupIndex,
      pattern: '*',
      showAllIndices: allowHidden,
    });
    const matchedSet = await loadMatchedIndices(title, allowHidden, allSrcs, {
      isRollupIndex,
      dataViews,
    });

    // todo this should probably go elsewhere. Does identify when sources are loaded - but why?
    isLoadingSources$.current.next(false);
    const matchedIndices = getMatchedIndices(
      allSrcs,
      matchedSet.partialMatched,
      matchedSet.exactMatched,
      allowHidden
    );
    matchedIndices$.current.next(matchedIndices);
  }, [dataViews, allowHidden, isLoadingSources$, matchedIndices$, title, getIsRollupIndex]);

  const loadRollupIndices = useCallback(async () => {
    try {
      const response = await http.get<RollupIndicesCapsResponse>('/api/rollup/indices');
      if (response) {
        rollupIndicesCapabilities$.current.next(response);
      }
    } catch (e) {
      // Silently swallow failure responses such as expired trials
    }
  }, [http]);
  const loadDataViewNames = useCallback(async () => {
    const dataViewListItems = await dataViews.getIdsWithTitle(editData ? true : false);
    const dataViewNames = dataViewListItems.map((item) => item.name || item.title);

    existingDataViewNames$.current.next(
      editData ? dataViewNames.filter((v) => v !== editData.name) : dataViewNames
    );
    isLoadingDataViewNames$.current.next(false);
  }, [dataViews, editData]);

  useEffect(() => {
    const matchedIndiceSub = matchedIndices$.current.subscribe((matchedIndices) => {
      if (matchedIndices.exactMatchedIndices.length && !loadingMatchedIndices$.current.getValue()) {
        const timeFieldQuery = editData ? editData.title : title;
        loadTimestampFields(removeSpaces(timeFieldQuery));
      }
    });

    loadIndices();
    loadDataViewNames();
    loadRollupIndices();

    return () => {
      matchedIndiceSub.unsubscribe();
    };
  }, [editData, loadIndices, loadDataViewNames, loadRollupIndices, loadTimestampFields, title]);

  const getRollupIndices = (rollupCaps: RollupIndicesCapsResponse) => Object.keys(rollupCaps);

  const reloadMatchedIndices = useCallback(
    async (newTitle: string) => {
      // is anything making sure this is complete before its used?
      const isRollupIndex = await getIsRollupIndex();
      let newRollupIndexName: string | undefined;

      const fetchIndices = async (query: string = '') => {
        const currentLoadingMatchedIndicesIdx = ++currentLoadingMatchedIndicesRef.current;

        loadingMatchedIndices$.current.next(true);

        const allSrcs = await dataViews.getIndices({
          isRollupIndex,
          pattern: '*',
          showAllIndices: allowHidden,
        });

        const { matchedIndicesResult, exactMatched } = !isLoadingSources
          ? await loadMatchedIndices(query, allowHidden, allSrcs, {
              isRollupIndex,
              dataViews,
            })
          : {
              matchedIndicesResult: matchedIndiciesDefault,
              exactMatched: [],
            };

        if (currentLoadingMatchedIndicesIdx === currentLoadingMatchedIndicesRef.current) {
          // we are still interested in this result
          if (type === INDEX_PATTERN_TYPE.ROLLUP) {
            const rollupIndices = exactMatched.filter((index) => isRollupIndex(index.name));
            newRollupIndexName = rollupIndices.length === 1 ? rollupIndices[0].name : undefined;
            rollupIndex$.current.next(newRollupIndexName);
          } else {
            rollupIndex$.current.next(undefined);
          }

          matchedIndices$.current.next(matchedIndicesResult);
          loadingMatchedIndices$.current.next(false);
        }

        return { matchedIndicesResult, newRollupIndexName };
      };

      return fetchIndices(newTitle);
    },
    [
      dataViews,
      allowHidden,
      type,
      getIsRollupIndex,
      rollupIndex$,
      isLoadingSources,
      matchedIndices$,
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
                matchedIndices$={matchedIndices$.current}
                rollupIndicesCapabilities={rollupIndicesCapabilities}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="l" />
          <EuiFlexGroup>
            <EuiFlexItem>
              <TimestampField
                options$={timestampFieldOptions$.current}
                isLoadingOptions$={loadingTimestampFields$.current}
                isLoadingMatchedIndices$={loadingMatchedIndices$.current}
                matchedIndices$={matchedIndices$.current}
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
          allowAdHoc={allowAdHoc}
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
            matchedIndices$={matchedIndices$.current}
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
    {
      isRollupIndex,
      dataViews,
    }: {
      isRollupIndex: (index: string) => boolean;
      dataViews: DataViewsPublicPluginStart;
    }
  ): Promise<{
    matchedIndicesResult: MatchedIndicesSet;
    exactMatched: MatchedItem[];
    partialMatched: MatchedItem[];
  }> => {
    const indexRequests = [];

    if (query?.endsWith('*')) {
      const exactMatchedQuery = dataViews.getIndices({
        isRollupIndex,
        pattern: query,
        showAllIndices: allowHidden,
      });
      indexRequests.push(exactMatchedQuery);
      // provide default value when not making a request for the partialMatchQuery
      indexRequests.push(Promise.resolve([]));
    } else {
      const exactMatchQuery = dataViews.getIndices({
        isRollupIndex,
        pattern: query,
        showAllIndices: allowHidden,
      });
      const partialMatchQuery = dataViews.getIndices({
        isRollupIndex,
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
