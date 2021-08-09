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

import {
  IndexPatternSpec,
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
  IndexPatternEditorContext,
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
  onSave: (indexPatternSpec: IndexPatternSpec) => void;
  /**
   * Handler for the "cancel" footer button
   */
  onCancel: () => void;
  defaultTypeIsRollup?: boolean;
  requireTimestampField?: boolean;
}

const editorTitle = i18n.translate('indexPatternEditor.title', {
  defaultMessage: 'Create index pattern',
});

const IndexPatternEditorFlyoutContentComponent = ({
  onSave,
  onCancel,
  defaultTypeIsRollup,
  requireTimestampField = false,
}: Props) => {
  const isMounted = useRef<boolean>(false);
  const {
    services: { http, indexPatternService, uiSettings },
  } = useKibana<IndexPatternEditorContext>();

  const { form } = useForm<IndexPatternConfig, FormInternal>({
    defaultValue: {
      type: defaultTypeIsRollup ? INDEX_PATTERN_TYPE.ROLLUP : INDEX_PATTERN_TYPE.DEFAULT,
    },
    schema,
    onSubmit: async (formData, isValid) => {
      if (!isValid) {
        return;
      }

      const indexPatternStub: IndexPatternSpec = {
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

  const [{ title, allowHidden, type }] = useFormData<FormInternal>({ form });
  const [isLoadingSources, setIsLoadingSources] = useState<boolean>(true);

  const [timestampFieldOptions, setTimestampFieldOptions] = useState<TimestampOption[]>([]);
  const [isLoadingTimestampFields, setIsLoadingTimestampFields] = useState<boolean>(false);
  const [isLoadingMatchedIndices, setIsLoadingMatchedIndices] = useState<boolean>(false);
  const [allSources, setAllSources] = useState<MatchedItem[]>([]);
  const [isLoadingIndexPatterns, setIsLoadingIndexPatterns] = useState<boolean>(true);
  const [existingIndexPatterns, setExistingIndexPatterns] = useState<string[]>([]);
  const [rollupIndex, setRollupIndex] = useState<string | undefined>();
  const [
    rollupIndicesCapabilities,
    setRollupIndicesCapabilities,
  ] = useState<RollupIndicesCapsResponse>({});
  const [matchedIndices, setMatchedIndices] = useState<MatchedIndicesSet>({
    allIndices: [],
    exactMatchedIndices: [],
    partialMatchedIndices: [],
    visibleIndices: [],
  });

  // load all data sources and set initial matchedIndices
  const loadSources = useCallback(() => {
    getIndices(http, () => false, '*', allowHidden).then((dataSources) => {
      setAllSources(dataSources);
      const matchedSet = getMatchedIndices(dataSources, [], [], allowHidden);
      setMatchedIndices(matchedSet);
      setIsLoadingSources(false);
    });
  }, [http, allowHidden]);

  // loading list of index patterns
  useEffect(() => {
    isMounted.current = true;
    loadSources();
    const getTitles = async () => {
      const indexPatternTitles = await indexPatternService.getTitles();
      if (isMounted.current) {
        setExistingIndexPatterns(indexPatternTitles);
        setIsLoadingIndexPatterns(false);
      }
    };
    getTitles();
    return () => {
      isMounted.current = false;
    };
  }, [http, indexPatternService, loadSources]);

  // loading rollup info
  useEffect(() => {
    const getRollups = async () => {
      try {
        const response = await http.get('/api/rollup/indices');
        if (isMounted.current) {
          setRollupIndicesCapabilities(response || {});
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
      let timestampOptions: TimestampOption[] = [];
      const isValidResult =
        !existingIndexPatterns.includes(query) && matchedIndices.exactMatchedIndices.length > 0;
      if (isValidResult) {
        setIsLoadingTimestampFields(true);
        const getFieldsOptions: GetFieldsOptions = {
          pattern: query,
        };
        if (type === INDEX_PATTERN_TYPE.ROLLUP) {
          getFieldsOptions.type = INDEX_PATTERN_TYPE.ROLLUP;
          getFieldsOptions.rollupIndex = rollupIndex;
        }

        const fields = await ensureMinimumTime(
          indexPatternService.getFieldsForWildcard(getFieldsOptions)
        );
        timestampOptions = extractTimeFields(fields, requireTimestampField);
      }
      if (isMounted.current) {
        setIsLoadingTimestampFields(false);
        setTimestampFieldOptions(timestampOptions);
      }
      return timestampOptions;
    },
    [
      existingIndexPatterns,
      indexPatternService,
      requireTimestampField,
      rollupIndex,
      type,
      matchedIndices.exactMatchedIndices,
    ]
  );

  useEffect(() => {
    loadTimestampFieldOptions(title);
    getFields().timestampField?.setValue('');
  }, [matchedIndices, loadTimestampFieldOptions, title, getFields]);

  const reloadMatchedIndices = useCallback(
    async (newTitle: string) => {
      const isRollupIndex = (indexName: string) =>
        getRollupIndices(rollupIndicesCapabilities).includes(indexName);
      let newRollupIndexName: string | undefined;

      const fetchIndices = async (query: string = '') => {
        setIsLoadingMatchedIndices(true);
        const indexRequests = [];

        if (query?.endsWith('*')) {
          const exactMatchedQuery = getIndices(http, isRollupIndex, query, allowHidden);
          indexRequests.push(exactMatchedQuery);
          // provide default value when not making a request for the partialMatchQuery
          indexRequests.push(Promise.resolve([]));
        } else {
          const exactMatchQuery = getIndices(http, isRollupIndex, query, allowHidden);
          const partialMatchQuery = getIndices(http, isRollupIndex, `${query}*`, allowHidden);

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

        if (isMounted.current) {
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
    [http, allowHidden, allSources, type, rollupIndicesCapabilities]
  );

  useEffect(() => {
    reloadMatchedIndices(title);
  }, [allowHidden, reloadMatchedIndices, title]);

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
    <EmptyPrompts
      onCancel={onCancel}
      allSources={allSources}
      hasExistingIndexPatterns={!!existingIndexPatterns.length}
      loadSources={loadSources}
    >
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
