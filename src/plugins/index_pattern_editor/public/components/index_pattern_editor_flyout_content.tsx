/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  EuiFlyoutFooter,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiButton,
  EuiSpacer,
  EuiLoadingSpinner,
  EuiComboBoxOptionOption,
} from '@elastic/eui';

import {
  IndexPatternSpec,
  Form,
  UseField,
  useForm,
  TextField,
  useFormData,
  ToggleField,
  useKibana,
  GetFieldsOptions,
} from '../shared_imports';

import {
  ensureMinimumTime,
  getIndices,
  extractTimeFields,
  getMatchedIndices,
  MatchedIndicesSet,
} from '../lib';
import { AdvancedParametersSection } from './field_editor/advanced_parameters_section';
import { FlyoutPanels } from './flyout_panels';

import {
  MatchedItem,
  ResolveIndexResponseItemAlias,
  IndexPatternEditorContext,
  RollupIndicesCapsResponse,
} from '../types';

import {
  LoadingIndices,
  StatusMessage,
  IndicesList,
  EmptyIndexPatternPrompt,
  EmptyState,
  TimestampField,
  TypeField,
  TitleField,
  schema,
  geti18nTexts,
} from '.';

const ROLLUP_TYPE = 'rollup';

export interface Props {
  /**
   * Handler for the "save" footer button
   */
  onSave: (indexPatternSpec: IndexPatternSpec) => void;
  /**
   * Handler for the "cancel" footer button
   */
  onCancel: () => void;
  existingIndexPatterns: string[];
  defaultTypeIsRollup?: boolean;
  requireTimestampField?: boolean;
}

export interface IndexPatternConfig {
  title: string;
  timestampField?: EuiComboBoxOptionOption<string>;
  allowHidden: boolean;
  id?: string;
  type: string;
}
export interface TimestampOption {
  display: string;
  fieldName?: string;
}

export interface FormInternal extends Omit<IndexPatternConfig, 'timestampField'> {
  timestampField?: TimestampOption;
}

const IndexPatternEditorFlyoutContentComponent = ({
  onSave,
  onCancel,
  defaultTypeIsRollup,
  requireTimestampField = false,
}: Props) => {
  const {
    services: { http, indexPatternService, uiSettings },
  } = useKibana<IndexPatternEditorContext>();

  const i18nTexts = geti18nTexts();

  // return type, interal type
  const { form } = useForm<IndexPatternConfig, FormInternal>({
    defaultValue: { type: defaultTypeIsRollup ? ROLLUP_TYPE : 'default' },
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

      if (type === ROLLUP_TYPE && rollupIndex) {
        indexPatternStub.type = ROLLUP_TYPE;
        indexPatternStub.typeMeta = {
          params: {
            rollup_index: rollupIndex,
          },
          aggs: (rollupIndicesCapabilities[rollupIndex] as any).aggs,
        };
      }

      await onSave(indexPatternStub);
    },
  });

  const [{ title, allowHidden, type, timestampField }] = useFormData<FormInternal>({ form });
  const [isLoadingSources, setIsLoadingSources] = useState<boolean>(true);

  const [lastTitle, setLastTitle] = useState('');
  const [timestampFieldOptions, setTimestampFieldOptions] = useState<TimestampOption[]>([]);
  const [isLoadingTimestampFields, setIsLoadingTimestampFields] = useState<boolean>(false);
  const [isLoadingMatchedIndices, setIsLoadingMatchedIndices] = useState<boolean>(false);
  const [allSources, setAllSources] = useState<MatchedItem[]>([]);
  const [remoteClustersExist, setRemoteClustersExist] = useState<boolean>(false);
  const [isLoadingIndexPatterns, setIsLoadingIndexPatterns] = useState<boolean>(true);
  const [goToForm, setGoToForm] = useState<boolean>(false);
  const [disableSubmit, setDisableSubmit] = useState<boolean>(true);
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

  const removeAliases = (item: MatchedItem) =>
    !((item as unknown) as ResolveIndexResponseItemAlias).indices;

  // load all data sources
  const loadSources = useCallback(() => {
    getIndices(http, () => [], '*', allowHidden).then((dataSources) => {
      setAllSources(dataSources);
      setIsLoadingSources(false);
    });
    getIndices(http, () => [], '*:*', false).then((dataSources) =>
      setRemoteClustersExist(!!dataSources.filter(removeAliases).length)
    );
  }, [http, allowHidden]);

  // loading list of index patterns
  useEffect(() => {
    let isMounted = true;
    loadSources();
    const getTitles = async () => {
      const indexPatternTitles = await indexPatternService.getTitles();
      if (isMounted) {
        setExistingIndexPatterns(indexPatternTitles);
        setIsLoadingIndexPatterns(false);
      }
    };
    getTitles();
    return () => {
      isMounted = false;
    };
  }, [http, indexPatternService, loadSources]);

  // loading rollup info
  useEffect(() => {
    let isMounted = true;
    const getRollups = async () => {
      try {
        const response = await http.get('/api/rollup/indices');
        if (isMounted) {
          setRollupIndicesCapabilities(response || {});
        }
      } catch (e) {
        // Silently swallow failure responses such as expired trials
      }
    };
    if (type === ROLLUP_TYPE) {
      getRollups();
    }
    return () => {
      isMounted = false;
    };
  }, [http, type]);

  // fetches indices and timestamp options
  useEffect(() => {
    const getRollupIndices = () => Object.keys(rollupIndicesCapabilities);
    const isRollupIndex = (indexName: string) => getRollupIndices().includes(indexName);
    const getIndexTags = (indexName: string) =>
      isRollupIndex(indexName)
        ? [
            {
              key: ROLLUP_TYPE,
              name: i18nTexts.rollupLabel,
              color: 'primary',
            },
          ]
        : [];

    const fetchIndices = async (query: string = '') => {
      setIsLoadingMatchedIndices(true);
      const indexRequests = [];

      if (query?.endsWith('*')) {
        const exactMatchedQuery = getIndices(http, getIndexTags, query, allowHidden);
        indexRequests.push(exactMatchedQuery);
        indexRequests.push(Promise.resolve([]));
      } else {
        const exactMatchQuery = getIndices(http, getIndexTags, query, allowHidden);
        const partialMatchQuery = getIndices(http, getIndexTags, `${query}*`, allowHidden);

        indexRequests.push(exactMatchQuery);
        indexRequests.push(partialMatchQuery);
      }

      const [exactMatched, partialMatched] = (await ensureMinimumTime(
        indexRequests
      )) as MatchedItem[][];

      if (query !== lastTitle) {
        return;
      }

      const isValidResult =
        !!title?.length && !existingIndexPatterns.includes(title) && exactMatched.length > 0;

      const matchedIndicesResult = getMatchedIndices(
        allSources,
        partialMatched,
        exactMatched,
        allowHidden
      );

      if (type === ROLLUP_TYPE) {
        const rollupIndices = exactMatched.filter((index) => isRollupIndex(index.name));
        setRollupIndex(rollupIndices.length === 1 ? rollupIndices[0].name : undefined);
      } else {
        setRollupIndex(undefined);
      }

      setMatchedIndices(matchedIndicesResult);
      setIsLoadingMatchedIndices(false);

      if (isValidResult) {
        setIsLoadingTimestampFields(true);
        const getFieldsOptions: GetFieldsOptions = {
          pattern: query,
        };
        if (type === ROLLUP_TYPE) {
          getFieldsOptions.type = ROLLUP_TYPE;
          getFieldsOptions.rollupIndex = rollupIndex;
        }

        const fields = await ensureMinimumTime(
          indexPatternService.getFieldsForWildcard(getFieldsOptions)
        );
        const timeFields = extractTimeFields(fields, requireTimestampField);
        setIsLoadingTimestampFields(false);
        setTimestampFieldOptions(timeFields);
      } else {
        setTimestampFieldOptions([]);
      }
    };

    setLastTitle(title);
    fetchIndices(title);
  }, [
    title,
    existingIndexPatterns,
    http,
    indexPatternService,
    allowHidden,
    lastTitle,
    allSources,
    requireTimestampField,
    rollupIndex,
    type,
    i18nTexts.rollupLabel,
    rollupIndicesCapabilities,
  ]);

  // todo
  if (isLoadingSources || isLoadingIndexPatterns) {
    return <EuiLoadingSpinner size="xl" />;
  }

  const hasDataIndices = allSources.some(({ name }: MatchedItem) => !name.startsWith('.'));

  if (!existingIndexPatterns.length && !goToForm) {
    if (!hasDataIndices && !remoteClustersExist) {
      // load data
      return (
        <EmptyState
          onRefresh={loadSources}
          closeFlyout={onCancel}
          createAnyway={() => setGoToForm(true)}
        />
      );
    } else {
      // first time
      return <EmptyIndexPatternPrompt goToCreate={() => setGoToForm(true)} />;
    }
  }

  const showIndexPatternTypeSelect = () =>
    uiSettings.isDeclared('rollups:enableIndexPatterns') &&
    uiSettings.get('rollups:enableIndexPatterns');

  const indexPatternTypeSelect = showIndexPatternTypeSelect() ? (
    <EuiFlexGroup>
      <EuiFlexItem>
        <TypeField
          onChange={(newType) => {
            if (newType === ROLLUP_TYPE) {
              form.setFieldValue('allowHidden', false);
            }
          }}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  ) : (
    <></>
  );

  const renderIndexList = () => {
    if (isLoadingSources) {
      return <></>;
    }

    const indicesToList = title?.length ? matchedIndices.visibleIndices : matchedIndices.allIndices;
    return (
      <IndicesList
        data-test-subj="createIndexPatternStep1IndicesList"
        query={title || ''}
        indices={indicesToList}
      />
    );
  };

  const renderStatusMessage = (matched: {
    allIndices: MatchedItem[];
    exactMatchedIndices: MatchedItem[];
    partialMatchedIndices: MatchedItem[];
  }) => {
    if (isLoadingSources) {
      return null;
    }

    return (
      <StatusMessage
        matchedIndices={matched}
        showSystemIndices={type === ROLLUP_TYPE ? false : true}
        isIncludingSystemIndices={allowHidden}
        query={title || ''}
      />
    );
  };

  // needed to trigger validation without touching advanced options
  if (title && timestampField) {
    form.validate().then((isValid) => {
      const disable =
        !isValid ||
        !matchedIndices.exactMatchedIndices.length ||
        (!!timestampFieldOptions.length && timestampField === undefined);
      setDisableSubmit(disable);
    });
  }

  const previewPanelContent = isLoadingIndexPatterns ? (
    <LoadingIndices />
  ) : (
    <>
      {renderStatusMessage(matchedIndices)}
      <EuiSpacer />
      {renderIndexList()}
    </>
  );

  // todo try to move within component
  const selectTimestampHelp = timestampFieldOptions.length ? i18nTexts.timestampFieldHelp : '';

  const timestampNoFieldsHelp =
    timestampFieldOptions.length === 0 &&
    !existingIndexPatterns.includes(title || '') &&
    !isLoadingMatchedIndices &&
    !isLoadingTimestampFields &&
    matchedIndices.exactMatchedIndices.length
      ? i18nTexts.noTimestampOptionText
      : '';
  //

  return (
    <>
      <FlyoutPanels.Group flyoutClassName={'indexPatternEditorFlyout'} maxWidth={1180}>
        <FlyoutPanels.Item>
          {/*
          possibly break out into own component
        */}
          {/* <EuiFlyoutHeader> */}
          <EuiTitle data-test-subj="flyoutTitle">
            <h2>Create index pattern</h2>
          </EuiTitle>
          {/* </EuiFlyoutHeader> */}
          <Form form={form} className="indexPatternEditor__form">
            {indexPatternTypeSelect}
            <EuiFlexGroup>
              {/* Name */}
              <EuiFlexItem>
                <TitleField
                  isRollup={form.getFields().type?.value === ROLLUP_TYPE}
                  existingIndexPatterns={existingIndexPatterns}
                  matchedIndices={matchedIndices.exactMatchedIndices}
                  rollupIndicesCapabilities={rollupIndicesCapabilities}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiFlexGroup>
              <EuiFlexItem>
                <TimestampField
                  options={timestampFieldOptions}
                  isLoadingOptions={isLoadingTimestampFields}
                  helpText={timestampNoFieldsHelp || selectTimestampHelp}
                />
              </EuiFlexItem>
            </EuiFlexGroup>

            <AdvancedParametersSection>
              <EuiFlexGroup>
                <EuiFlexItem>
                  <UseField<boolean, IndexPatternConfig>
                    path={'allowHidden'}
                    component={ToggleField}
                    data-test-subj="allowHiddenField"
                    componentProps={{
                      euiFieldProps: {
                        'aria-label': i18nTexts.allowHiddenAriaLabel,
                      },
                    }}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiFlexGroup>
                <EuiFlexItem>
                  <UseField<string, IndexPatternConfig>
                    path={'id'}
                    component={TextField}
                    data-test-subj="savedObjectIdField"
                    componentProps={{
                      euiFieldProps: {
                        'aria-label': i18nTexts.customIndexPatternIdLabel,
                      },
                    }}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </AdvancedParametersSection>
          </Form>
          {/* </EuiFlyoutBody> */}
          {/* modal */}
          <EuiFlyoutFooter>
            <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  iconType="cross"
                  flush="left"
                  onClick={onCancel}
                  data-test-subj="closeFlyoutButton"
                >
                  {i18nTexts.closeButtonLabel}
                </EuiButtonEmpty>
              </EuiFlexItem>

              <EuiFlexItem grow={false}>
                <EuiButton
                  color="primary"
                  onClick={() => form.submit()}
                  data-test-subj="saveIndexPatternButton"
                  fill
                  disabled={disableSubmit}
                >
                  {i18nTexts.saveButtonLabel}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlyoutFooter>
        </FlyoutPanels.Item>
        <FlyoutPanels.Item>{previewPanelContent}</FlyoutPanels.Item>
      </FlyoutPanels.Group>
    </>
  );
};

export const IndexPatternEditorFlyoutContent = React.memo(IndexPatternEditorFlyoutContentComponent);
