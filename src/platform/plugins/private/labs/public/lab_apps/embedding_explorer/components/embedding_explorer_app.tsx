/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiButton,
  EuiCallOut,
  EuiEmptyPrompt,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiHorizontalRule,
  EuiLoadingChart,
  EuiPanel,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ApplicationStart, HttpStart } from '@kbn/core/public';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { dynamic } from '@kbn/shared-ux-utility';
import {
  EMBEDDING_EXPLORER_INDEX_DATA_API_PATH,
  EMBEDDING_EXPLORER_DEFAULT_INDEX_SAMPLE_SIZE,
  EMBEDDING_EXPLORER_INDEX_FIELDS_API_PATH,
  EMBEDDING_EXPLORER_INDICES_API_PATH,
  EMBEDDING_EXPLORER_SAMPLE_INDICES_API_PATH,
  type EmbeddingExplorerDatasetResponse,
  type EmbeddingExplorerIndexDataRequest,
  type EmbeddingExplorerIndexDataResponse,
  type EmbeddingExplorerIndexFieldsResponse,
  type EmbeddingExplorerIndicesResponse,
  type EmbeddingExplorerPoint,
  type EmbeddingExplorerSampleIndicesResponse,
} from '../../../../common';
import { getSuggestedField, getSuggestedProjectionField } from '../field_suggestions';
import { findPointSearchMatches } from '../point_search';

interface EmbeddingExplorerAppProps {
  application: ApplicationStart;
  http: HttpStart;
}

interface CustomFieldState {
  categoryField: string;
  labelField: string;
  vectorField: string;
  xField: string;
  yField: string;
}

const getNearestProjectionNeighbors = (
  points: readonly EmbeddingExplorerPoint[],
  pointId: string,
  count: number
) => {
  const origin = points.find((point) => point.id === pointId);

  if (!origin) {
    return [];
  }

  return points
    .filter((point) => point.id !== pointId)
    .map((point) => ({
      distance: Math.hypot(point.x - origin.x, point.y - origin.y),
      point,
    }))
    .sort((left, right) => left.distance - right.distance)
    .slice(0, count)
    .map(({ point }) => point);
};

const getCosineDistance = (left: number[], right: number[]) => {
  let dotProduct = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;

  for (let index = 0; index < left.length; index += 1) {
    const leftValue = left[index];
    const rightValue = right[index];

    dotProduct += leftValue * rightValue;
    leftMagnitude += leftValue * leftValue;
    rightMagnitude += rightValue * rightValue;
  }

  if (leftMagnitude === 0 || rightMagnitude === 0) {
    return 1;
  }

  return 1 - dotProduct / (Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude));
};

type AtlasEmbeddingViewComponent = typeof import('./atlas_embedding_view').AtlasEmbeddingView;

const LazyAtlasEmbeddingView = dynamic<AtlasEmbeddingViewComponent>(
  () =>
    import('./atlas_embedding_view').then((module) => ({
      default: module.AtlasEmbeddingView,
    })),
  {
    fallback: (
      <div
        style={{
          alignItems: 'center',
          display: 'flex',
          height: 560,
          justifyContent: 'center',
        }}
      >
        <EuiLoadingChart
          aria-label={i18n.translate('labs.embeddingExplorer.loadingAtlasAriaLabel', {
            defaultMessage: 'Loading embedding atlas view',
          })}
          size="xl"
        />
      </div>
    ),
  }
);

const getSelectOptions = (
  values: readonly string[],
  defaultLabel: string,
  { allowEmpty = false }: { allowEmpty?: boolean } = {}
) => [
  ...(allowEmpty ? [{ text: defaultLabel, value: '' }] : []),
  ...values.map((value) => ({ text: value, value })),
];

const getHttpErrorMessage = (error: unknown) => {
  if (!error || typeof error !== 'object' || !('body' in error)) {
    return undefined;
  }

  const body = (error as { body?: { message?: string } }).body;
  return typeof body?.message === 'string' ? body.message : undefined;
};

const projectDatasetWithUmap = async (
  dataset: EmbeddingExplorerIndexDataResponse
): Promise<EmbeddingExplorerDatasetResponse> => {
  if (dataset.projectionSource !== 'computed') {
    return dataset;
  }

  const vectors = dataset.points
    .map((point) => point.vector)
    .filter((vector): vector is number[] => Array.isArray(vector) && vector.length > 0);

  if (!vectors.length) {
    throw new Error(
      i18n.translate('labs.embeddingExplorer.missingVectorProjectionErrorMessage', {
        defaultMessage:
          'No dense-vector values were available to compute a client-side projection.',
      })
    );
  }

  if (vectors.length < 2) {
    throw new Error(
      i18n.translate('labs.embeddingExplorer.notEnoughVectorsProjectionErrorMessage', {
        defaultMessage:
          'At least two vector documents are required to compute a client-side projection.',
      })
    );
  }

  const dimension = vectors[0].length;

  if (!vectors.every((vector) => vector.length === dimension)) {
    throw new Error(
      i18n.translate('labs.embeddingExplorer.mismatchedVectorDimensionsErrorMessage', {
        defaultMessage:
          'The selected index returned vectors with inconsistent dimensions, so the projection could not be computed.',
      })
    );
  }

  const { UMAP } = await import('umap-js');
  const neighborCount = Math.min(15, vectors.length - 1);
  const umap = new UMAP({
    distanceFn: getCosineDistance,
    minDist: 0.1,
    nNeighbors: neighborCount,
    nComponents: 2,
  });
  const embedding = await umap.fitAsync(vectors);

  return {
    ...dataset,
    points: dataset.points.map((point, index) => ({
      ...point,
      vector: undefined,
      x: embedding[index][0],
      y: embedding[index][1],
    })),
  };
};

export const EmbeddingExplorerApp = ({ application, http }: EmbeddingExplorerAppProps) => {
  const [loadedDataset, setLoadedDataset] = useState<EmbeddingExplorerDatasetResponse | null>(null);
  const [indices, setIndices] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState('');
  const [fieldOptions, setFieldOptions] = useState<EmbeddingExplorerIndexFieldsResponse | null>(
    null
  );
  const [fieldState, setFieldState] = useState<CustomFieldState>({
    categoryField: '',
    labelField: '',
    vectorField: '',
    xField: '',
    yField: '',
  });
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
  const [hoveredPointId, setHoveredPointId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSampleIndicesStatusLoading, setIsSampleIndicesStatusLoading] = useState(true);
  const [isSampleIndicesLoading, setIsSampleIndicesLoading] = useState(false);
  const [isIndicesLoading, setIsIndicesLoading] = useState(false);
  const [isFieldsLoading, setIsFieldsLoading] = useState(false);
  const [isCustomDatasetLoading, setIsCustomDatasetLoading] = useState(false);
  const [isProjectionComputing, setIsProjectionComputing] = useState(false);
  const [loadError, setLoadError] = useState<string>();
  const [sampleIndicesStatus, setSampleIndicesStatus] =
    useState<EmbeddingExplorerSampleIndicesResponse | null>(null);
  const [sampleIndicesError, setSampleIndicesError] = useState<string>();

  useEffect(() => {
    let isMounted = true;

    void http
      .get<EmbeddingExplorerSampleIndicesResponse>(EMBEDDING_EXPLORER_SAMPLE_INDICES_API_PATH)
      .then((response) => {
        if (isMounted) {
          setSampleIndicesStatus(response);
          setSampleIndicesError(undefined);
          setIndices((current) =>
            Array.from(new Set([response.projectedIndex, response.vectorOnlyIndex, ...current]))
          );
        }
      })
      .catch((error) => {
        if (isMounted) {
          setSampleIndicesError(
            getHttpErrorMessage(error) ??
              i18n.translate('labs.embeddingExplorer.sampleIndicesStatusErrorMessage', {
                defaultMessage:
                  'Unable to check whether the sample Elasticsearch indices are already available.',
              })
          );
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsSampleIndicesStatusLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [http]);

  useEffect(() => {
    let isMounted = true;
    setIsIndicesLoading(true);

    void http
      .get<EmbeddingExplorerIndicesResponse>(EMBEDDING_EXPLORER_INDICES_API_PATH)
      .then((response) => {
        if (isMounted) {
          setIndices(response.indices.map(({ name }) => name));
        }
      })
      .catch(() => {
        if (isMounted) {
          setLoadError(
            i18n.translate('labs.embeddingExplorer.indicesErrorMessage', {
              defaultMessage: 'Unable to load Elasticsearch indices for this lab.',
            })
          );
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsIndicesLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [http]);

  useEffect(() => {
    if (!sampleIndicesStatus?.isReady || selectedIndex) {
      return;
    }

    setSelectedIndex(sampleIndicesStatus.projectedIndex);
  }, [sampleIndicesStatus, selectedIndex]);

  useEffect(() => {
    if (!selectedIndex) {
      setFieldOptions(null);
      setFieldState({
        categoryField: '',
        labelField: '',
        vectorField: '',
        xField: '',
        yField: '',
      });
      return;
    }

    let isMounted = true;
    setIsFieldsLoading(true);
    setLoadedDataset(null);
    setSelectedPointId(null);
    setHoveredPointId(null);
    setSearchQuery('');

    void http
      .post<EmbeddingExplorerIndexFieldsResponse>(EMBEDDING_EXPLORER_INDEX_FIELDS_API_PATH, {
        body: JSON.stringify({ index: selectedIndex }),
      })
      .then((response) => {
        if (!isMounted) {
          return;
        }

        setFieldOptions(response);
        setFieldState({
          categoryField: getSuggestedField(response.categoryFields, [
            'type',
            'severity',
            'category',
            'source',
          ]),
          labelField: getSuggestedField(response.labelFields, [
            'message',
            'summary',
            'description',
            'title',
          ]),
          vectorField: response.vectorFields[0] ?? '',
          xField: getSuggestedProjectionField(response.projectionFields, 'x'),
          yField: getSuggestedProjectionField(response.projectionFields, 'y'),
        });
      })
      .catch(() => {
        if (isMounted) {
          setLoadError(
            i18n.translate('labs.embeddingExplorer.indexFieldsErrorMessage', {
              defaultMessage: 'Unable to inspect fields for the selected index.',
            })
          );
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsFieldsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [http, selectedIndex]);

  const handleLoadCustomDataset = useCallback(async () => {
    if (!selectedIndex || !fieldState.vectorField) {
      return;
    }

    setIsCustomDatasetLoading(true);
    setIsProjectionComputing(false);
    setLoadError(undefined);
    const hasProjectionPair = Boolean(fieldState.xField && fieldState.yField);

    const request: EmbeddingExplorerIndexDataRequest = {
      categoryField: fieldState.categoryField || undefined,
      index: selectedIndex,
      labelField: fieldState.labelField || undefined,
      size: EMBEDDING_EXPLORER_DEFAULT_INDEX_SAMPLE_SIZE,
      vectorField: fieldState.vectorField,
      xField: hasProjectionPair ? fieldState.xField : undefined,
      yField: hasProjectionPair ? fieldState.yField : undefined,
    };

    try {
      const response = await http.post<EmbeddingExplorerIndexDataResponse>(
        EMBEDDING_EXPLORER_INDEX_DATA_API_PATH,
        { body: JSON.stringify(request) }
      );
      if (response.projectionSource === 'computed') {
        setIsProjectionComputing(true);
      }
      const projectedDataset = await projectDatasetWithUmap(response);
      setLoadedDataset(projectedDataset);
      setSelectedPointId(projectedDataset.points[0]?.id ?? null);
    } catch (error) {
      setLoadError(
        getHttpErrorMessage(error) ??
          i18n.translate('labs.embeddingExplorer.customDatasetErrorMessage', {
            defaultMessage: 'Unable to load projected data from the selected index.',
          })
      );
    } finally {
      setIsProjectionComputing(false);
      setIsCustomDatasetLoading(false);
    }
  }, [fieldState, http, selectedIndex]);

  const handleLoadSampleIndices = useCallback(async () => {
    setIsSampleIndicesLoading(true);
    setLoadError(undefined);
    setSampleIndicesError(undefined);

    try {
      const response = await http.post<EmbeddingExplorerSampleIndicesResponse>(
        EMBEDDING_EXPLORER_SAMPLE_INDICES_API_PATH
      );

      setSampleIndicesStatus(response);
      setIndices((current) =>
        Array.from(new Set([response.projectedIndex, response.vectorOnlyIndex, ...current]))
      );
      setSelectedIndex(response.projectedIndex);
    } catch (error) {
      setSampleIndicesError(
        getHttpErrorMessage(error) ??
          i18n.translate('labs.embeddingExplorer.sampleIndicesSetupErrorMessage', {
            defaultMessage: 'Unable to load the sample embeddings into Elasticsearch.',
          })
      );
    } finally {
      setIsSampleIndicesLoading(false);
    }
  }, [http]);

  const activeDataset = loadedDataset;
  const points = useMemo(() => activeDataset?.points ?? [], [activeDataset]);
  const pointLookup = useMemo(() => new Map(points.map((point) => [point.id, point])), [points]);
  const trimmedSearchQuery = searchQuery.trim();
  const isSearchActive = Boolean(trimmedSearchQuery);
  const searchMatches = useMemo(
    () => findPointSearchMatches(points, trimmedSearchQuery),
    [points, trimmedSearchQuery]
  );
  const searchMatchedPointIds = useMemo(
    () => searchMatches.map(({ pointId }) => pointId),
    [searchMatches]
  );
  const searchMatchedPointIdSet = useMemo(
    () => new Set(searchMatchedPointIds),
    [searchMatchedPointIds]
  );

  useEffect(() => {
    if (!selectedPointId || pointLookup.has(selectedPointId)) {
      return;
    }

    setSelectedPointId(null);
  }, [pointLookup, selectedPointId]);

  useEffect(() => {
    const firstMatchedPointId = searchMatchedPointIds[0];

    if (!isSearchActive || !firstMatchedPointId) {
      return;
    }

    if (selectedPointId && searchMatchedPointIdSet.has(selectedPointId)) {
      return;
    }

    setSelectedPointId(firstMatchedPointId);
  }, [isSearchActive, searchMatchedPointIdSet, searchMatchedPointIds, selectedPointId]);

  const selectedPoint = selectedPointId ? pointLookup.get(selectedPointId) ?? null : null;
  const hoveredPoint = hoveredPointId ? pointLookup.get(hoveredPointId) ?? null : null;
  const detailsPoint = selectedPoint ?? hoveredPoint;

  const nearestNeighbors = useMemo(
    () => (selectedPointId ? getNearestProjectionNeighbors(points, selectedPointId, 5) : []),
    [points, selectedPointId]
  );

  const highlightedPointIds = useMemo(
    () =>
      Array.from(
        new Set(
          isSearchActive
            ? [...searchMatchedPointIds, ...(selectedPointId ? [selectedPointId] : [])]
            : selectedPointId
            ? [selectedPointId, ...nearestNeighbors.map((point) => point.id)]
            : []
        )
      ),
    [isSearchActive, nearestNeighbors, searchMatchedPointIds, selectedPointId]
  );

  const hasProjectionPair = Boolean(fieldState.xField && fieldState.yField);
  const hasPartialProjection = Boolean(fieldState.xField || fieldState.yField);
  const canLoadCustomDataset =
    Boolean(selectedIndex) &&
    Boolean(fieldState.vectorField) &&
    (!hasPartialProjection || hasProjectionPair);

  const detailItems = useMemo(() => {
    if (!detailsPoint) {
      return [];
    }

    return [
      {
        title: i18n.translate('labs.embeddingExplorer.detailsCategoryLabel', {
          defaultMessage: 'Category',
        }),
        description: detailsPoint.category,
      },
      {
        title: i18n.translate('labs.embeddingExplorer.detailsSourceLabel', {
          defaultMessage: 'Source',
        }),
        description: detailsPoint.source,
      },
      ...Object.entries(detailsPoint.metadata).map(([key, value]) => ({
        title: key,
        description: String(value),
      })),
    ];
  }, [detailsPoint]);

  return (
    <KibanaPageTemplate
      data-test-subj="labsEmbeddingExplorerApp"
      pageHeader={{
        pageTitle: i18n.translate('labs.embeddingExplorer.pageTitle', {
          defaultMessage: 'Embedding explorer',
        }),
        rightSideItems: [
          <EuiButton
            key="backToLabs"
            data-test-subj="labsEmbeddingExplorerBackButton"
            onClick={() => application.navigateToApp('labs')}
          >
            {i18n.translate('labs.embeddingExplorer.backToLabsButtonLabel', {
              defaultMessage: 'Back to Labs',
            })}
          </EuiButton>,
        ],
      }}
    >
      {!isSampleIndicesStatusLoading && !sampleIndicesStatus?.isReady ? (
        <KibanaPageTemplate.Section grow={false}>
          <EuiCallOut
            announceOnMount={false}
            color={sampleIndicesError ? 'danger' : 'warning'}
            data-test-subj="labsEmbeddingExplorerSampleIndicesCallout"
            iconType="iInCircle"
            title={
              sampleIndicesError
                ? i18n.translate('labs.embeddingExplorer.sampleIndicesErrorTitle', {
                    defaultMessage: 'Unable to prepare the sample Elasticsearch indices',
                  })
                : i18n.translate('labs.embeddingExplorer.sampleIndicesSetupTitle', {
                    defaultMessage: 'One more setup step: load the sample into Elasticsearch',
                  })
            }
          >
            <p>
              {sampleIndicesError
                ? sampleIndicesError
                : i18n.translate('labs.embeddingExplorer.sampleIndicesSetupDescription', {
                    defaultMessage:
                      'To try the built-in Hacker News example, first create two sample Elasticsearch indices. This action loads the bundled embeddings into Elasticsearch and then preselects the projected sample index in the form below.',
                  })}
            </p>
            <EuiSpacer size="m" />
            <EuiButton
              data-test-subj="labsEmbeddingExplorerLoadSampleIndicesButton"
              fill
              isLoading={isSampleIndicesLoading}
              onClick={() => void handleLoadSampleIndices()}
            >
              {i18n.translate('labs.embeddingExplorer.loadSampleIndicesButtonLabel', {
                defaultMessage: 'Load sample into Elasticsearch',
              })}
            </EuiButton>
          </EuiCallOut>
        </KibanaPageTemplate.Section>
      ) : null}

      <KibanaPageTemplate.Section grow={false}>
        <EuiPanel hasBorder hasShadow={false} paddingSize="m">
          <EuiFlexGroup alignItems="flexEnd" gutterSize="m" wrap>
            <EuiFlexItem grow={2}>
              <EuiFormRow
                label={i18n.translate('labs.embeddingExplorer.indexSelectLabel', {
                  defaultMessage: 'Index',
                })}
              >
                <EuiSelect
                  compressed
                  data-test-subj="labsEmbeddingExplorerIndexSelect"
                  disabled={isIndicesLoading}
                  onChange={(event) => setSelectedIndex(event.target.value)}
                  options={getSelectOptions(
                    indices,
                    i18n.translate('labs.embeddingExplorer.indexSelectPlaceholder', {
                      defaultMessage: 'Select an index',
                    }),
                    { allowEmpty: true }
                  )}
                  value={selectedIndex}
                />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem grow={1}>
              <EuiFormRow
                label={i18n.translate('labs.embeddingExplorer.vectorFieldLabel', {
                  defaultMessage: 'Vector field',
                })}
              >
                <EuiSelect
                  compressed
                  disabled={!fieldOptions || isFieldsLoading}
                  onChange={(event) =>
                    setFieldState((current) => ({
                      ...current,
                      vectorField: event.target.value,
                    }))
                  }
                  options={getSelectOptions(
                    fieldOptions?.vectorFields ?? [],
                    i18n.translate('labs.embeddingExplorer.vectorFieldPlaceholder', {
                      defaultMessage: 'Select a vector field',
                    }),
                    { allowEmpty: true }
                  )}
                  value={fieldState.vectorField}
                />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem grow={1}>
              <EuiFormRow
                label={i18n.translate('labs.embeddingExplorer.xFieldLabel', {
                  defaultMessage: 'Projection X field (optional)',
                })}
              >
                <EuiSelect
                  compressed
                  disabled={!fieldOptions || isFieldsLoading}
                  onChange={(event) =>
                    setFieldState((current) => ({ ...current, xField: event.target.value }))
                  }
                  options={getSelectOptions(
                    fieldOptions?.projectionFields ?? [],
                    i18n.translate('labs.embeddingExplorer.xFieldPlaceholder', {
                      defaultMessage: 'Select an X field',
                    }),
                    { allowEmpty: true }
                  )}
                  value={fieldState.xField}
                />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem grow={1}>
              <EuiFormRow
                label={i18n.translate('labs.embeddingExplorer.yFieldLabel', {
                  defaultMessage: 'Projection Y field (optional)',
                })}
              >
                <EuiSelect
                  compressed
                  disabled={!fieldOptions || isFieldsLoading}
                  onChange={(event) =>
                    setFieldState((current) => ({ ...current, yField: event.target.value }))
                  }
                  options={getSelectOptions(
                    fieldOptions?.projectionFields ?? [],
                    i18n.translate('labs.embeddingExplorer.yFieldPlaceholder', {
                      defaultMessage: 'Select a Y field',
                    }),
                    { allowEmpty: true }
                  )}
                  value={fieldState.yField}
                />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem grow={1}>
              <EuiFormRow
                label={i18n.translate('labs.embeddingExplorer.labelFieldLabel', {
                  defaultMessage: 'Label field',
                })}
              >
                <EuiSelect
                  compressed
                  disabled={!fieldOptions || isFieldsLoading}
                  onChange={(event) =>
                    setFieldState((current) => ({ ...current, labelField: event.target.value }))
                  }
                  options={getSelectOptions(
                    fieldOptions?.labelFields ?? [],
                    i18n.translate('labs.embeddingExplorer.labelFieldPlaceholder', {
                      defaultMessage: 'Optional label field',
                    }),
                    { allowEmpty: true }
                  )}
                  value={fieldState.labelField}
                />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem grow={1}>
              <EuiFormRow
                label={i18n.translate('labs.embeddingExplorer.categoryFieldLabel', {
                  defaultMessage: 'Category field',
                })}
              >
                <EuiSelect
                  compressed
                  disabled={!fieldOptions || isFieldsLoading}
                  onChange={(event) =>
                    setFieldState((current) => ({
                      ...current,
                      categoryField: event.target.value,
                    }))
                  }
                  options={getSelectOptions(
                    fieldOptions?.categoryFields ?? [],
                    i18n.translate('labs.embeddingExplorer.categoryFieldPlaceholder', {
                      defaultMessage: 'Optional category field',
                    }),
                    { allowEmpty: true }
                  )}
                  value={fieldState.categoryField}
                />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                data-test-subj="labsEmbeddingExplorerLoadCustomDatasetButton"
                disabled={!canLoadCustomDataset}
                fill
                isLoading={isCustomDatasetLoading}
                onClick={() => void handleLoadCustomDataset()}
              >
                {i18n.translate('labs.embeddingExplorer.loadIndexButtonLabel', {
                  defaultMessage: 'Load index',
                })}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
          {loadError ? (
            <>
              <EuiSpacer size="m" />
              <EuiCallOut
                announceOnMount
                color="danger"
                data-test-subj="labsEmbeddingExplorerErrorCallout"
                title={i18n.translate('labs.embeddingExplorer.errorTitle', {
                  defaultMessage: 'Unable to load explorer data',
                })}
              >
                <p>{loadError}</p>
              </EuiCallOut>
            </>
          ) : null}
        </EuiPanel>
      </KibanaPageTemplate.Section>

      <KibanaPageTemplate.Section grow={false}>
        <EuiFlexGroup alignItems="stretch" gutterSize="l">
          <EuiFlexItem grow={3}>
            <EuiPanel hasBorder hasShadow={false} paddingSize="m">
              <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiTitle size="s">
                    <h2>
                      {activeDataset?.datasetName ??
                        i18n.translate('labs.embeddingExplorer.defaultDatasetTitle', {
                          defaultMessage: 'Select an index',
                        })}
                    </h2>
                  </EuiTitle>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="s">
                    {i18n.translate('labs.embeddingExplorer.pointCountLabel', {
                      defaultMessage: '{count} points',
                      values: { count: points.length },
                    })}
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiSpacer size="s" />
              {points.length > 0 ? (
                <>
                  <EuiFormRow
                    helpText={
                      isSearchActive
                        ? searchMatches.length > 0
                          ? i18n.translate('labs.embeddingExplorer.pointSearchMatchesDescription', {
                              defaultMessage:
                                '{count, plural, one {# matching point highlighted} other {# matching points highlighted}}',
                              values: { count: searchMatches.length },
                            })
                          : i18n.translate(
                              'labs.embeddingExplorer.pointSearchNoMatchesDescription',
                              {
                                defaultMessage: 'No matching points found.',
                              }
                            )
                        : i18n.translate('labs.embeddingExplorer.pointSearchHelpText', {
                            defaultMessage:
                              'Fuzzy search labels, summaries, and metadata to highlight matching points.',
                          })
                    }
                    label={i18n.translate('labs.embeddingExplorer.pointSearchLabel', {
                      defaultMessage: 'Search points',
                    })}
                  >
                    <EuiFieldSearch
                      compressed
                      data-test-subj="labsEmbeddingExplorerPointSearchInput"
                      fullWidth
                      isClearable
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder={i18n.translate('labs.embeddingExplorer.pointSearchPlaceholder', {
                        defaultMessage: 'Search labels, summaries, or metadata',
                      })}
                      value={searchQuery}
                    />
                  </EuiFormRow>
                  <EuiSpacer size="s" />
                </>
              ) : null}
              {isCustomDatasetLoading || isProjectionComputing ? (
                <div
                  style={{
                    alignItems: 'center',
                    display: 'flex',
                    height: 560,
                    justifyContent: 'center',
                  }}
                >
                  <EuiLoadingChart
                    aria-label={i18n.translate('labs.embeddingExplorer.loadingDatasetAriaLabel', {
                      defaultMessage: 'Loading embedding dataset',
                    })}
                    size="xl"
                  />
                  <EuiSpacer size="m" />
                  {isProjectionComputing ? (
                    <EuiText size="s">
                      <p>
                        {i18n.translate('labs.embeddingExplorer.computingProjectionLabel', {
                          defaultMessage:
                            'Computing a UMAP projection from sampled vectors in the browser.',
                        })}
                      </p>
                    </EuiText>
                  ) : null}
                </div>
              ) : points.length > 0 ? (
                <LazyAtlasEmbeddingView
                  onHoverChange={setHoveredPointId}
                  onSelectionChange={setSelectedPointId}
                  points={points}
                  selectedPointIds={highlightedPointIds}
                />
              ) : (
                <EuiEmptyPrompt
                  iconType="visVega"
                  title={
                    <h3>
                      {i18n.translate('labs.embeddingExplorer.noDatasetTitle', {
                        defaultMessage: 'No dataset loaded yet',
                      })}
                    </h3>
                  }
                  body={
                    <p>
                      {i18n.translate('labs.embeddingExplorer.noDatasetBodyDescription', {
                        defaultMessage:
                          'Choose an index with vector embeddings and optional projection fields, or load the built-in sample into Elasticsearch, then load the dataset.',
                      })}
                    </p>
                  }
                />
              )}
            </EuiPanel>
          </EuiFlexItem>

          <EuiFlexItem grow={2}>
            <EuiPanel hasBorder hasShadow={false} paddingSize="m">
              <EuiTitle size="s">
                <h2>
                  {i18n.translate('labs.embeddingExplorer.detailsPanelTitle', {
                    defaultMessage: 'Selection details',
                  })}
                </h2>
              </EuiTitle>
              <EuiSpacer size="m" />
              {detailsPoint ? (
                <>
                  <EuiText size="s">
                    <p style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                      {detailsPoint.summary}
                    </p>
                  </EuiText>
                  <EuiSpacer size="m" />
                  <div
                    style={{
                      columnGap: 16,
                      display: 'grid',
                      gridTemplateColumns: 'minmax(120px, 160px) minmax(0, 1fr)',
                      rowGap: 8,
                    }}
                  >
                    {detailItems.map((item) => (
                      <React.Fragment key={item.title}>
                        <div style={{ fontWeight: 600, overflowWrap: 'anywhere' }}>
                          {item.title}
                        </div>
                        <div
                          style={{ minWidth: 0, overflowWrap: 'anywhere', wordBreak: 'break-word' }}
                        >
                          {item.description}
                        </div>
                      </React.Fragment>
                    ))}
                  </div>
                  <EuiHorizontalRule margin="m" />
                  <EuiTitle size="xs">
                    <h3>
                      {i18n.translate('labs.embeddingExplorer.nearestNeighborsTitle', {
                        defaultMessage: 'Nearby points in projection',
                      })}
                    </h3>
                  </EuiTitle>
                  <EuiSpacer size="s" />
                  {nearestNeighbors.length > 0 ? (
                    <EuiText size="s">
                      <ul>
                        {nearestNeighbors.map((neighbor) => (
                          <li key={neighbor.id}>
                            <button
                              onClick={() => setSelectedPointId(neighbor.id)}
                              style={{
                                background: 'transparent',
                                border: 0,
                                color: 'inherit',
                                cursor: 'pointer',
                                padding: 0,
                                textAlign: 'left',
                                whiteSpace: 'normal',
                                width: '100%',
                                wordBreak: 'break-word',
                              }}
                              type="button"
                            >
                              <strong>{neighbor.label}</strong>: {neighbor.summary}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </EuiText>
                  ) : (
                    <EuiText size="s">
                      <p>
                        {i18n.translate('labs.embeddingExplorer.noNeighborsDescription', {
                          defaultMessage:
                            'Select a point to highlight nearby points in the rendered projection.',
                        })}
                      </p>
                    </EuiText>
                  )}
                </>
              ) : (
                <EuiEmptyPrompt
                  iconType="inspect"
                  title={
                    <h3>
                      {i18n.translate('labs.embeddingExplorer.noSelectionTitle', {
                        defaultMessage: 'Select a point to inspect it',
                      })}
                    </h3>
                  }
                  body={
                    <p>
                      {i18n.translate('labs.embeddingExplorer.noSelectionDescription', {
                        defaultMessage:
                          'Click a point in the view to inspect its metadata and highlight nearby points.',
                      })}
                    </p>
                  }
                />
              )}
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGroup>
      </KibanaPageTemplate.Section>
    </KibanaPageTemplate>
  );
};
