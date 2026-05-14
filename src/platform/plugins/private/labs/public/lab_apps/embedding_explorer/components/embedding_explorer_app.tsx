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
  EuiButtonGroup,
  EuiCallOut,
  EuiDescriptionList,
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
  EuiSwitch,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { ApplicationStart, HttpStart } from '@kbn/core/public';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { dynamic } from '@kbn/shared-ux-utility';
import {
  EMBEDDING_EXPLORER_INDEX_DATA_API_PATH,
  EMBEDDING_EXPLORER_INDEX_FIELDS_API_PATH,
  EMBEDDING_EXPLORER_INDICES_API_PATH,
  EMBEDDING_EXPLORER_SAMPLE_API_PATH,
  type EmbeddingExplorerDatasetResponse,
  type EmbeddingExplorerIndexDataRequest,
  type EmbeddingExplorerIndexDataResponse,
  type EmbeddingExplorerIndexFieldsResponse,
  type EmbeddingExplorerIndicesResponse,
  type EmbeddingExplorerPoint,
} from '../../../../common';

type DataSourceMode = 'sample' | 'custom';

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

const getSuggestedProjectionField = (fields: readonly string[], axis: 'x' | 'y') => {
  const rankedField = [...fields].sort((left, right) => {
    const leftScore = getProjectionFieldScore(left, axis);
    const rightScore = getProjectionFieldScore(right, axis);

    if (leftScore === rightScore) {
      return left.localeCompare(right);
    }

    return rightScore - leftScore;
  })[0];

  return rankedField ?? '';
};

const getProjectionFieldScore = (fieldName: string, axis: 'x' | 'y') => {
  const normalized = fieldName.toLowerCase();

  if (normalized === axis || normalized.endsWith(`.${axis}`)) {
    return 100;
  }

  if (
    normalized.includes(`projection.${axis}`) ||
    normalized.includes(`projection_${axis}`) ||
    normalized.includes(`umap_${axis}`) ||
    normalized.includes(`umap.${axis}`)
  ) {
    return 90;
  }

  if (normalized.endsWith(`_${axis}`) || normalized.includes(`.${axis}_`)) {
    return 75;
  }

  if (normalized.includes(axis)) {
    return 50;
  }

  return 0;
};

const getSuggestedField = (fields: readonly string[], candidates: readonly string[]) => {
  const loweredCandidates = candidates.map((candidate) => candidate.toLowerCase());
  return (
    fields.find((field) =>
      loweredCandidates.some((candidate) => field.toLowerCase().includes(candidate))
    ) ??
    fields[0] ??
    ''
  );
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
  const [activeMode, setActiveMode] = useState<DataSourceMode>('sample');
  const [densityMode, setDensityMode] = useState(true);
  const [sampleDataset, setSampleDataset] = useState<EmbeddingExplorerDatasetResponse | null>(null);
  const [customDataset, setCustomDataset] = useState<EmbeddingExplorerDatasetResponse | null>(null);
  const [indices, setIndices] = useState<string[]>([]);
  const [indexQuery, setIndexQuery] = useState('');
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
  const [isSampleLoading, setIsSampleLoading] = useState(true);
  const [isIndicesLoading, setIsIndicesLoading] = useState(false);
  const [isFieldsLoading, setIsFieldsLoading] = useState(false);
  const [isCustomDatasetLoading, setIsCustomDatasetLoading] = useState(false);
  const [isProjectionComputing, setIsProjectionComputing] = useState(false);
  const [loadError, setLoadError] = useState<string>();

  useEffect(() => {
    let isMounted = true;

    void http
      .get<EmbeddingExplorerDatasetResponse>(EMBEDDING_EXPLORER_SAMPLE_API_PATH)
      .then((response) => {
        if (isMounted) {
          setSampleDataset(response);
        }
      })
      .catch(() => {
        if (isMounted) {
          setLoadError(
            i18n.translate('labs.embeddingExplorer.sampleDatasetErrorMessage', {
              defaultMessage: 'Unable to load the sample embedding dataset.',
            })
          );
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsSampleLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [http]);

  useEffect(() => {
    if (activeMode !== 'custom') {
      return;
    }

    let isMounted = true;
    setIsIndicesLoading(true);

    void http
      .get<EmbeddingExplorerIndicesResponse>(EMBEDDING_EXPLORER_INDICES_API_PATH, {
        query: {
          search_query: indexQuery,
        },
      })
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
  }, [activeMode, http, indexQuery]);

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
    setCustomDataset(null);
    setSelectedPointId(null);
    setHoveredPointId(null);

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
      size: 200,
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
      setCustomDataset(projectedDataset);
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

  const activeDataset = activeMode === 'sample' ? sampleDataset : customDataset;
  const points = useMemo(() => activeDataset?.points ?? [], [activeDataset]);
  const pointLookup = useMemo(() => new Map(points.map((point) => [point.id, point])), [points]);

  useEffect(() => {
    if (!selectedPointId || pointLookup.has(selectedPointId)) {
      return;
    }

    setSelectedPointId(null);
  }, [pointLookup, selectedPointId]);

  const selectedPoint = selectedPointId ? pointLookup.get(selectedPointId) ?? null : null;
  const hoveredPoint = hoveredPointId ? pointLookup.get(hoveredPointId) ?? null : null;
  const detailsPoint = selectedPoint ?? hoveredPoint;

  const nearestNeighbors = useMemo(
    () => (selectedPointId ? getNearestProjectionNeighbors(points, selectedPointId, 5) : []),
    [points, selectedPointId]
  );

  const highlightedPointIds = useMemo(
    () => (selectedPointId ? [selectedPointId, ...nearestNeighbors.map((point) => point.id)] : []),
    [nearestNeighbors, selectedPointId]
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
      <KibanaPageTemplate.Section>
        <EuiText>
          <p>
            <FormattedMessage
              id="labs.embeddingExplorer.pageDescription"
              defaultMessage="This Atlas-based spike lets you explore a few thousand preprojected Hacker News embeddings immediately and preview compatible Elasticsearch indices that already expose projection fields."
            />
          </p>
        </EuiText>
      </KibanaPageTemplate.Section>

      <KibanaPageTemplate.Section>
        <EuiPanel hasBorder hasShadow={false} paddingSize="m">
          <EuiFlexGroup alignItems="flexEnd" gutterSize="m" wrap>
            <EuiFlexItem grow={2}>
              <EuiFormRow
                label={i18n.translate('labs.embeddingExplorer.dataSourceLabel', {
                  defaultMessage: 'Data source',
                })}
              >
                <EuiButtonGroup
                  buttonSize="compressed"
                  idSelected={activeMode}
                  isFullWidth
                  legend={i18n.translate('labs.embeddingExplorer.dataSourceGroupLegend', {
                    defaultMessage: 'Choose an embedding explorer data source',
                  })}
                  onChange={(value: string) => {
                    setActiveMode(value as DataSourceMode);
                    setLoadError(undefined);
                  }}
                  options={[
                    {
                      id: 'sample',
                      label: i18n.translate('labs.embeddingExplorer.sampleModeOptionLabel', {
                        defaultMessage: 'Sample dataset',
                      }),
                    },
                    {
                      id: 'custom',
                      label: i18n.translate('labs.embeddingExplorer.customModeOptionLabel', {
                        defaultMessage: 'My index',
                      }),
                    },
                  ]}
                />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiSwitch
                checked={densityMode}
                label={i18n.translate('labs.embeddingExplorer.densityModeToggleSwitch', {
                  defaultMessage: 'Density mode',
                })}
                onChange={(event) => setDensityMode(event.target.checked)}
              />
            </EuiFlexItem>
          </EuiFlexGroup>

          {activeMode === 'custom' ? (
            <>
              <EuiSpacer size="m" />
              <EuiFlexGroup alignItems="flexEnd" gutterSize="m" wrap>
                <EuiFlexItem grow={2}>
                  <EuiFormRow
                    label={i18n.translate('labs.embeddingExplorer.indexSearchLabel', {
                      defaultMessage: 'Index search',
                    })}
                  >
                    <EuiFieldSearch
                      compressed
                      isLoading={isIndicesLoading}
                      onChange={(event) => setIndexQuery(event.target.value)}
                      placeholder={i18n.translate('labs.embeddingExplorer.indexSearchPlaceholder', {
                        defaultMessage: 'Filter indices',
                      })}
                      value={indexQuery}
                    />
                  </EuiFormRow>
                </EuiFlexItem>
                <EuiFlexItem grow={2}>
                  <EuiFormRow
                    label={i18n.translate('labs.embeddingExplorer.indexSelectLabel', {
                      defaultMessage: 'Index',
                    })}
                  >
                    <EuiSelect
                      compressed
                      data-test-subj="labsEmbeddingExplorerIndexSelect"
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
                      defaultMessage: 'Projection X field',
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
                      defaultMessage: 'Projection Y field',
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
              {fieldOptions ? (
                <>
                  <EuiSpacer size="m" />
                  <EuiCallOut
                    announceOnMount={false}
                    color="warning"
                    iconType="iInCircle"
                    title={i18n.translate('labs.embeddingExplorer.customIndexNoticeTitle', {
                      defaultMessage: 'Projection fields are required in this first pass',
                    })}
                  >
                    <p>
                      {fieldOptions.projectionRequiredNotice}{' '}
                      {fieldOptions.rawVectorProjectionNotice}
                    </p>
                  </EuiCallOut>
                </>
              ) : null}
            </>
          ) : null}

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

      <KibanaPageTemplate.Section>
        <EuiFlexGroup alignItems="stretch" gutterSize="l">
          <EuiFlexItem grow={3}>
            <EuiPanel hasBorder hasShadow={false} paddingSize="m">
              <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiTitle size="s">
                    <h2>
                      {activeDataset?.datasetName ??
                        i18n.translate('labs.embeddingExplorer.loadingDatasetTitle', {
                          defaultMessage: 'Loading dataset',
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
              {activeDataset?.description ? (
                <>
                  <EuiText size="s">
                    <p>{activeDataset.description}</p>
                  </EuiText>
                  <EuiSpacer size="s" />
                </>
              ) : null}
              {activeDataset?.projectionNote ? (
                <>
                  <EuiCallOut
                    announceOnMount={false}
                    color="primary"
                    iconType="visVega"
                    title={i18n.translate('labs.embeddingExplorer.projectionNoteTitle', {
                      defaultMessage: 'Projection note',
                    })}
                  >
                    <p>{activeDataset.projectionNote}</p>
                  </EuiCallOut>
                  <EuiSpacer size="m" />
                </>
              ) : null}
              {isSampleLoading ||
              (activeMode === 'custom' && (isCustomDatasetLoading || isProjectionComputing)) ? (
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
                  densityMode={densityMode}
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
                      {activeMode === 'sample'
                        ? i18n.translate('labs.embeddingExplorer.noSampleBodyDescription', {
                            defaultMessage: 'The sample dataset is still loading.',
                          })
                        : i18n.translate('labs.embeddingExplorer.noCustomDatasetBodyDescription', {
                            defaultMessage:
                              'Choose an index with vector and projection fields, then load the dataset.',
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
                  <EuiTitle size="xs">
                    <h3>{detailsPoint.label}</h3>
                  </EuiTitle>
                  <EuiSpacer size="s" />
                  <EuiText size="s">
                    <p>{detailsPoint.summary}</p>
                  </EuiText>
                  <EuiSpacer size="m" />
                  <EuiDescriptionList compressed listItems={detailItems} type="column" />
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
