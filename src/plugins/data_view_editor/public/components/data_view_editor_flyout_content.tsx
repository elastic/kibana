/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { EuiTitle, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiLoadingSpinner } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import memoizeOne from 'memoize-one';
import { DataViewField } from '@kbn/data-views-plugin/public';

import {
  DataViewSpec,
  Form,
  useForm,
  useFormData,
  useKibana,
  GetFieldsOptions,
} from '../shared_imports';

import { ensureMinimumTime, getIndices, extractTimeFields, getMatchedIndices } from '../lib';
import { FlyoutPanels } from './flyout_panels';

import {
  MatchedItem,
  DataViewEditorContext,
  RollupIndicesCapsResponse,
  INDEX_PATTERN_TYPE,
  IndexPatternConfig,
  MatchedIndicesSet,
  FormInternal,
  TimestampOption,
} from '../types';

import {
  TimestampField,
  TypeField,
  TitleField,
  schema,
  Footer,
  AdvancedParamsContent,
  EmptyPrompts,
  PreviewPanel,
  RollupBetaWarning,
} from '.';

export interface Props {
  /**
   * Handler for the "save" footer button
   */
  onSave: (dataViewSpec: DataViewSpec) => void;
  /**
   * Handler for the "cancel" footer button
   */
  onCancel: () => void;
  defaultTypeIsRollup?: boolean;
  requireTimestampField?: boolean;
}

const editorTitle = i18n.translate('indexPatternEditor.title', {
  defaultMessage: 'Create data view',
});

const IndexPatternEditorFlyoutContentComponent = ({
  onSave,
  onCancel,
  defaultTypeIsRollup,
  requireTimestampField = false,
}: Props) => {
  const {
    services: { http, dataViews, uiSettings, searchClient },
  } = useKibana<DataViewEditorContext>();

  const { form } = useForm<IndexPatternConfig, FormInternal>({
    defaultValue: {
      type: defaultTypeIsRollup ? INDEX_PATTERN_TYPE.ROLLUP : INDEX_PATTERN_TYPE.DEFAULT,
    },
    schema,
    onSubmit: async (formData, isValid) => {
      if (!isValid) {
        return;
      }

      const indexPatternStub: DataViewSpec = {
        title: formData.title,
        timeFieldName: formData.timestampField?.value,
        id: formData.id,
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

      await onSave(indexPatternStub);
    },
  });

  const { getFields } = form;

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
  const [isLoadingSources, setIsLoadingSources] = useState<boolean>(true);

  const [timestampFieldOptions, setTimestampFieldOptions] = useState<TimestampOption[]>([]);
  const [isLoadingTimestampFields, setIsLoadingTimestampFields] = useState<boolean>(false);
  const currentLoadingTimestampFieldsRef = useRef(0);
  const [isLoadingMatchedIndices, setIsLoadingMatchedIndices] = useState<boolean>(false);
  const currentLoadingMatchedIndicesRef = useRef(0);
  const [allSources, setAllSources] = useState<MatchedItem[]>([]);
  const [isLoadingIndexPatterns, setIsLoadingIndexPatterns] = useState<boolean>(true);
  const [existingIndexPatterns, setExistingIndexPatterns] = useState<string[]>([]);
  const [rollupIndex, setRollupIndex] = useState<string | undefined>();
  const [rollupIndicesCapabilities, setRollupIndicesCapabilities] =
    useState<RollupIndicesCapsResponse>({});
  const [matchedIndices, setMatchedIndices] = useState<MatchedIndicesSet>({
    allIndices: [],
    exactMatchedIndices: [],
    partialMatchedIndices: [],
    visibleIndices: [],
  });

  // load all data sources and set initial matchedIndices
  const loadSources = useCallback(() => {
    getIndices({
      http,
      isRollupIndex: () => false,
      pattern: '*',
      showAllIndices: allowHidden,
    }).then((dataSources) => {
      setAllSources(dataSources);
      const matchedSet = getMatchedIndices(dataSources, [], [], allowHidden);
      setMatchedIndices(matchedSet);
      setIsLoadingSources(false);
    });
  }, [http, allowHidden]);

  // loading list of index patterns
  useEffect(() => {
    loadSources();
    const getTitles = async () => {
      const indexPatternTitles = await dataViews.getTitles();

      setExistingIndexPatterns(indexPatternTitles);
      setIsLoadingIndexPatterns(false);
    };
    getTitles();
  }, [http, dataViews, loadSources]);

  // loading rollup info
  useEffect(() => {
    const getRollups = async () => {
      try {
        const response = await http.get<RollupIndicesCapsResponse>('/api/rollup/indices');
        if (response) {
          setRollupIndicesCapabilities(response);
        }
      } catch (e) {
        // Silently swallow failure responses such as expired trials
      }
    };

    getRollups();
  }, [http, type]);

  const getRollupIndices = (rollupCaps: RollupIndicesCapsResponse) => Object.keys(rollupCaps);

  const loadTimestampFieldOptions = useCallback(
    async (query: string) => {
      const currentLoadingTimestampFieldsIdx = ++currentLoadingTimestampFieldsRef.current;
      let timestampOptions: TimestampOption[] = [];
      const isValidResult =
        !existingIndexPatterns.includes(query) &&
        matchedIndices.exactMatchedIndices.length > 0 &&
        !isLoadingMatchedIndices;
      if (isValidResult) {
        setIsLoadingTimestampFields(true);
        const getFieldsOptions: GetFieldsOptions = {
          pattern: query,
        };
        if (type === INDEX_PATTERN_TYPE.ROLLUP) {
          getFieldsOptions.type = INDEX_PATTERN_TYPE.ROLLUP;
          getFieldsOptions.rollupIndex = rollupIndex;
        }

        const fields = await ensureMinimumTime(dataViews.getFieldsForWildcard(getFieldsOptions));
        timestampOptions = extractTimeFields(fields as DataViewField[], requireTimestampField);
      }
      if (currentLoadingTimestampFieldsIdx === currentLoadingTimestampFieldsRef.current) {
        setIsLoadingTimestampFields(false);
        setTimestampFieldOptions(timestampOptions);
      }
      return timestampOptions;
    },
    [
      existingIndexPatterns,
      dataViews,
      requireTimestampField,
      rollupIndex,
      type,
      matchedIndices.exactMatchedIndices,
      isLoadingMatchedIndices,
    ]
  );

  useEffect(() => {
    loadTimestampFieldOptions(title);
    getFields().timestampField?.setValue('');
  }, [loadTimestampFieldOptions, title, getFields]);

  const reloadMatchedIndices = useCallback(
    async (newTitle: string) => {
      const isRollupIndex = (indexName: string) =>
        getRollupIndices(rollupIndicesCapabilities).includes(indexName);
      let newRollupIndexName: string | undefined;

      const fetchIndices = async (query: string = '') => {
        const currentLoadingMatchedIndicesIdx = ++currentLoadingMatchedIndicesRef.current;

        setIsLoadingMatchedIndices(true);

        const { matchedIndicesResult, exactMatched } = !isLoadingSources
          ? await loadMatchedIndices(query, allowHidden, allSources, {
              isRollupIndex,
              http,
              searchClient,
            })
          : {
              matchedIndicesResult: {
                exactMatchedIndices: [],
                allIndices: [],
                partialMatchedIndices: [],
                visibleIndices: [],
              },
              exactMatched: [],
            };

        if (currentLoadingMatchedIndicesIdx === currentLoadingMatchedIndicesRef.current) {
          // we are still interested in this result
          if (type === INDEX_PATTERN_TYPE.ROLLUP) {
            const rollupIndices = exactMatched.filter((index) => isRollupIndex(index.name));
            newRollupIndexName = rollupIndices.length === 1 ? rollupIndices[0].name : undefined;
            setRollupIndex(newRollupIndexName);
          } else {
            setRollupIndex(undefined);
          }

          setMatchedIndices(matchedIndicesResult);
          setIsLoadingMatchedIndices(false);
        }

        return { matchedIndicesResult, newRollupIndexName };
      };

      return fetchIndices(newTitle);
    },
    [http, allowHidden, allSources, type, rollupIndicesCapabilities, searchClient, isLoadingSources]
  );

  const onTypeChange = useCallback(
    (newType) => {
      form.setFieldValue('title', '');
      form.setFieldValue('timestampField', '');
      if (newType === INDEX_PATTERN_TYPE.ROLLUP) {
        form.setFieldValue('allowHidden', false);
      }
    },
    [form]
  );

  if (isLoadingSources || isLoadingIndexPatterns) {
    return <EuiLoadingSpinner size="xl" />;
  }

  const showIndexPatternTypeSelect = () =>
    uiSettings.isDeclared('rollups:enableIndexPatterns') &&
    uiSettings.get('rollups:enableIndexPatterns') &&
    getRollupIndices(rollupIndicesCapabilities).length;

  const indexPatternTypeSelect = showIndexPatternTypeSelect() ? (
    <>
      <EuiSpacer size="m" />
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
    <EmptyPrompts onCancel={onCancel} allSources={allSources} loadSources={loadSources}>
      <FlyoutPanels.Group flyoutClassName={'indexPatternEditorFlyout'} maxWidth={1180}>
        <FlyoutPanels.Item className="fieldEditor__mainFlyoutPanel" border="right">
          <EuiTitle data-test-subj="flyoutTitle">
            <h2>{editorTitle}</h2>
          </EuiTitle>
          <Form form={form} className="indexPatternEditor__form">
            {indexPatternTypeSelect}
            <EuiSpacer size="m" />
            <EuiFlexGroup>
              <EuiFlexItem>
                <TitleField
                  isRollup={form.getFields().type?.value === INDEX_PATTERN_TYPE.ROLLUP}
                  existingIndexPatterns={existingIndexPatterns}
                  refreshMatchedIndices={reloadMatchedIndices}
                  matchedIndices={matchedIndices.exactMatchedIndices}
                  rollupIndicesCapabilities={rollupIndicesCapabilities}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="m" />
            <EuiFlexGroup>
              <EuiFlexItem>
                <TimestampField
                  options={timestampFieldOptions}
                  isLoadingOptions={isLoadingTimestampFields}
                  isExistingIndexPattern={existingIndexPatterns.includes(title)}
                  isLoadingMatchedIndices={isLoadingMatchedIndices}
                  hasMatchedIndices={!!matchedIndices.exactMatchedIndices.length}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
            <AdvancedParamsContent disableAllowHidden={type === INDEX_PATTERN_TYPE.ROLLUP} />
          </Form>
          <Footer
            onCancel={onCancel}
            onSubmit={() => form.submit()}
            submitDisabled={form.isSubmitted && !form.isValid}
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
              matched={matchedIndices}
            />
          )}
        </FlyoutPanels.Item>
      </FlyoutPanels.Group>
    </EmptyPrompts>
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
      http,
      searchClient,
    }: {
      isRollupIndex: (index: string) => boolean;
      http: DataViewEditorContext['http'];
      searchClient: DataViewEditorContext['searchClient'];
    }
  ): Promise<{
    matchedIndicesResult: MatchedIndicesSet;
    exactMatched: MatchedItem[];
    partialMatched: MatchedItem[];
  }> => {
    const indexRequests = [];

    if (query?.endsWith('*')) {
      const exactMatchedQuery = getIndices({
        http,
        isRollupIndex,
        pattern: query,
        showAllIndices: allowHidden,
      });
      indexRequests.push(exactMatchedQuery);
      // provide default value when not making a request for the partialMatchQuery
      indexRequests.push(Promise.resolve([]));
    } else {
      const exactMatchQuery = getIndices({
        http,
        isRollupIndex,
        pattern: query,
        showAllIndices: allowHidden,
      });
      const partialMatchQuery = getIndices({
        http,
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
