/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiButton,
  EuiSpacer,
} from '@elastic/eui';

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
  IndexPatternSpec,
  Form,
  UseField,
  useForm,
  TextField,
  useFormData,
  ToggleField,
  useKibana,
} from '../shared_imports';

import {
  MatchedItem,
  ResolveIndexResponseItemAlias,
  // IndexPatternTableItem,
  IndexPatternEditorContext,
} from '../types';

import { schema } from './form_schema';
import { TimestampField, TypeField, TitleField } from './form_fields';
import { EmptyState } from './empty_state';
import { EmptyIndexPatternPrompt } from './empty_index_pattern_prompt';
import { IndexPatternCreationConfig } from '../service';
import { IndicesList } from './indices_list';
import { StatusMessage } from './status_message';

export interface Props {
  /**
   * Handler for the "save" footer button
   */
  onSave: (indexPatternSpec: IndexPatternSpec) => void;
  /**
   * Handler for the "cancel" footer button
   */
  onCancel: () => void;

  // uiSettings: CoreStart['uiSettings'];
  isSaving: boolean;
  existingIndexPatterns: string[];
}

export interface IndexPatternConfig {
  title: string;
  timestampField?: string; // TimestampOption;
  allowHidden: boolean;
  id?: string;
  type: string;
}
export interface TimestampOption {
  display: string;
  fieldName?: string;
  isDisabled?: boolean;
}

export interface FormInternal extends Omit<IndexPatternConfig, 'timestampField'> {
  timestampField?: TimestampOption;
}

const geti18nTexts = () => {
  return {
    closeButtonLabel: i18n.translate('indexPatternEditor.editor.flyoutCloseButtonLabel', {
      defaultMessage: 'Close',
    }),
    saveButtonLabel: i18n.translate('indexPatternEditor.editor.flyoutSaveButtonLabel', {
      defaultMessage: 'Save',
    }),
  };
};

const IndexPatternEditorFlyoutContentComponent = ({ onSave, onCancel, isSaving }: Props) => {
  const {
    services: { http, indexPatternService, uiSettings, indexPatternCreateService },
  } = useKibana<IndexPatternEditorContext>();
  const i18nTexts = geti18nTexts();

  // return type, interal type
  const { form } = useForm<IndexPatternConfig, FormInternal>({
    defaultValue: { title: '' },
    schema,
  });

  const [{ title, allowHidden, type }] = useFormData<FormInternal>({ form });
  const [isLoadingSources, setIsLoadingSources] = useState<boolean>(true);

  const [formState, setFormState] = useState<{ isSubmitted: boolean; isValid: boolean }>({
    isSubmitted: false,
    isValid: false,
    /* isValid: field ? true : undefined,
    submit: field
      ? async () => ({ isValid: true, data: field })
      : async () => ({ isValid: false, data: {} as Field }),
      */
  });
  const [lastTitle, setLastTitle] = useState('');
  const [exactMatchedIndices, setExactMatchedIndices] = useState<MatchedItem[]>([]);
  const [timestampFields, setTimestampFields] = useState<TimestampOption[]>([]);
  const [sources, setSources] = useState<MatchedItem[]>([]);
  const [remoteClustersExist, setRemoteClustersExist] = useState<boolean>(false);
  const [isLoadingIndexPatterns, setIsLoadingIndexPatterns] = useState<boolean>(true);
  const [goToForm, setGoToForm] = useState<boolean>(false);
  const [isInitiallyLoadingIndices, setIsInitiallyLoadingIndices] = useState<boolean>(true);
  const [matchedIndices, setMatchedIndices] = useState<MatchedIndicesSet>({
    allIndices: [],
    exactMatchedIndices: [],
    partialMatchedIndices: [],
    visibleIndices: [],
  });

  // const [indexPatterns, setIndexPatterns] = useState<IndexPatternTableItem[]>([]);
  const [
    indexPatternCreationType,
    setIndexPatternCreationType,
  ] = useState<IndexPatternCreationConfig>(indexPatternCreateService.creation.getType('default'));

  const [existingIndexPatterns, setExistingIndexPatterns] = useState<string[]>([]);

  const removeAliases = (item: MatchedItem) =>
    !((item as unknown) as ResolveIndexResponseItemAlias).indices;

  // loading main source list - but we need to filter out `.` indices
  const loadSources = useCallback(() => {
    getIndices(http, () => [], '*', allowHidden).then((dataSources) => {
      // todo why was this being done?
      // setSources(dataSources.filter(removeAliases))
      setSources(dataSources);
      // todo - why two?
      setIsLoadingSources(false);
      setIsInitiallyLoadingIndices(false);
    });
    getIndices(http, () => [], '*:*', false).then((dataSources) =>
      setRemoteClustersExist(!!dataSources.filter(removeAliases).length)
    );
  }, [http, allowHidden]);

  // loading list of index patterns
  useEffect(() => {
    let isMounted = true;
    /*
    getIndices(http, () => [], '*', false).then(async (dataSources) => {
      if (isMounted) {
        setSources(dataSources.filter(removeAliases));
        setIsLoadingSources(false);
      }
    });
    getIndices(http, () => [], '*:*', false).then((dataSources) => {
      if (isMounted) {
        setRemoteClustersExist(!!dataSources.filter(removeAliases).length);
      }
    });
    */
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

  // updates index pattern creation type based on selection
  useEffect(() => {
    const updatedCreationType = indexPatternCreateService.creation.getType(type);
    setIndexPatternCreationType(updatedCreationType);
    if (type === 'rollup') {
      form.setFieldValue('allowHidden', false);
    }
  }, [type, indexPatternCreateService.creation, form]);

  useEffect(() => {
    const fetchIndices = async (query: string = '') => {
      /*
      if (!query) {
        setMatchedIndices(getMatchedIndices(sources, [], [], allowHidden));
        return;
      }
      */
      // const { indexPatternCreationType } = this.props;

      // this.setState({ isLoadingIndices: true, indexPatternExists: false });
      const indexRequests = [];

      if (query?.endsWith('*')) {
        const exactMatchedQuery = getIndices(
          http,
          (indexName: string) => indexPatternCreationType.getIndexTags(indexName),
          query,
          allowHidden
        );
        indexRequests.push(exactMatchedQuery);
        indexRequests.push(Promise.resolve([]));
      } else {
        const exactMatchQuery = getIndices(
          http,
          (indexName: string) => indexPatternCreationType.getIndexTags(indexName),
          query,
          allowHidden
        );
        const partialMatchQuery = getIndices(
          http,
          (indexName: string) => indexPatternCreationType.getIndexTags(indexName),
          `${query}*`,
          allowHidden
        );

        indexRequests.push(exactMatchQuery);
        indexRequests.push(partialMatchQuery);
      }

      if (query !== lastTitle) {
        return;
      }
      const [exactMatched, partialMatched] = (await ensureMinimumTime(
        indexRequests
      )) as MatchedItem[][];

      // If the search changed, discard this state

      // if (query !== this.lastQuery) {
      //  return;
      // }

      const isValidResult =
        !!title?.length && !existingIndexPatterns.includes(title) && exactMatched.length > 0;

      setFormState({
        isSubmitted: false,
        isValid: isValidResult, // todo show error when index pattern already exists
      });

      const matchedIndicesResult = getMatchedIndices(
        sources,
        partialMatched,
        exactMatched,
        allowHidden
      );

      setMatchedIndices(matchedIndicesResult);

      if (isValidResult) {
        const fields = await ensureMinimumTime(
          indexPatternService.getFieldsForWildcard({
            pattern: query,
            ...indexPatternCreationType.getFetchForWildcardOptions(),
          })
        );
        const timeFields = extractTimeFields(fields);
        setTimestampFields(timeFields);
      } else {
        setTimestampFields([]);
      }
    };

    // Whenever the field "type" changes we clear any possible painless syntax
    // error as it is possibly stale.
    setLastTitle(title);

    fetchIndices(title);
  }, [
    title,
    existingIndexPatterns,
    http,
    indexPatternService,
    allowHidden,
    lastTitle,
    indexPatternCreationType,
    sources,
  ]);

  const { isValid } = formState;
  const onClickSave = async () => {
    // todo display result
    indexPatternCreationType.checkIndicesForErrors(exactMatchedIndices);
    const formData = form.getFormData();
    await onSave({
      title: formData.title,
      timeFieldName: formData.timestampField,
      id: formData.id,
      ...indexPatternCreationType.getIndexPatternMappings(),
    });
  };

  // todo
  if (isLoadingSources || isLoadingIndexPatterns) {
    return <>loading</>;
  }

  const hasDataIndices = sources.some(({ name }: MatchedItem) => !name.startsWith('.'));

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
        <TypeField />
      </EuiFlexItem>
    </EuiFlexGroup>
  ) : (
    <></>
  );

  const renderIndexList = () => {
    // todo indexPatternExists
    if (isLoadingSources) {
      //  || indexPatternExists) {
      return <></>;
    }

    // const indicesToList = title?.length ? visibleIndices : sources;
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
    // const { query, isLoadingIndices, indexPatternExists, isIncludingSystemIndices } = this.state;
    // todo index patterns exist
    if (isLoadingSources) {
      // || indexPatternExists) {
      return null;
    }

    return (
      <StatusMessage
        matchedIndices={matched}
        showSystemIndices={indexPatternCreationType.getShowSystemIndices()}
        isIncludingSystemIndices={allowHidden}
        query={title || ''}
      />
    );
  };

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
                <TitleField />
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiFlexGroup>
              <EuiFlexItem>
                <TimestampField options={timestampFields} />
              </EuiFlexItem>
            </EuiFlexGroup>

            <div>{exactMatchedIndices.map((item) => item.name).join(', ')}</div>
            <AdvancedParametersSection>
              <EuiFlexGroup>
                <EuiFlexItem>
                  <UseField<boolean, IndexPatternConfig>
                    path={'allowHidden'}
                    component={ToggleField}
                    data-test-subj="allowHiddenField"
                    componentProps={{
                      euiFieldProps: {
                        'aria-label': i18n.translate(
                          'indexPatternEditor.form.allowHiddenAriaLabel',
                          {
                            defaultMessage: 'Allow hidden and system indices',
                          }
                        ),
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
                        'aria-label': i18n.translate(
                          'indexPatternEditor.form.customIndexPatternIdLabel',
                          {
                            defaultMessage: 'Custom index pattern ID',
                          }
                        ),
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
                  onClick={onClickSave}
                  data-test-subj="saveIndexPatternButton"
                  fill
                  disabled={
                    !isValid ||
                    !exactMatchedIndices.length ||
                    !!indexPatternCreationType.checkIndicesForErrors(exactMatchedIndices) // todo display errors
                  }
                  // isLoading={isSavingField || isValidating}
                >
                  {i18nTexts.saveButtonLabel}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlyoutFooter>
        </FlyoutPanels.Item>
        <FlyoutPanels.Item>
          {renderStatusMessage(matchedIndices)}
          <EuiSpacer />
          {renderIndexList()}
        </FlyoutPanels.Item>
      </FlyoutPanels.Group>
    </>
  );
};

export const IndexPatternEditorFlyoutContent = React.memo(IndexPatternEditorFlyoutContentComponent);
