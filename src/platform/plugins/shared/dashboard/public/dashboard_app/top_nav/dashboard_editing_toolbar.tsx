/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  useEuiTheme,
  EuiFlyoutHeader,
  EuiFieldText,
  EuiTextArea,
  EuiTitle,
  EuiFlyoutBody,
  EuiButton,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useState, useCallback, useEffect } from 'react';

import { AddFromLibraryButton, Toolbar, ToolbarButton } from '@kbn/shared-ux-button-toolbar';

import { useStateFromPublishingSubject } from '@kbn/presentation-publishing';
import useMountedState from 'react-use/lib/useMountedState';
import { openLazyFlyout } from '@kbn/presentation-util';
import { i18n } from '@kbn/i18n';
import { MessageRole } from '@kbn/inference-common';
import { useDashboardApi } from '../../dashboard_api/use_dashboard_api';
import { getCreateVisualizationButtonTitle } from '../_dashboard_app_strings';
import { ControlsToolbarButton } from './controls_toolbar_button';
import { AddPanelButton } from './add_panel_button/components/add_panel_button';
import { executeAddLensPanelAction } from '../../dashboard_actions/execute_add_lens_panel_action';
import { addFromLibrary } from '../../dashboard_renderer/add_panel_from_library';
import { coreServices, inferenceService } from '../../services/kibana_services';

const PLACEHOLDER_USER_PROMPT =
  'Create a Lens XY bar chart visualization for index "kibana_sample_data_ecommerce" for count vs top 10 values of clientip';
const PLACEHOLDER_JSON = {
  panelType: 'lens',
  serializedState: {
    rawState: {
      enhancements: {
        dynamicActions: {
          events: [],
        },
      },
      syncColors: false,
      syncCursor: true,
      syncTooltips: false,
      filters: [],
      query: {
        query: '',
        language: 'kuery',
      },
      attributes: {
        title: '',
        visualizationType: 'lnsXY',
        type: 'lens',
        references: [
          {
            type: 'index-pattern',
            id: '90943e30-9a47-11e8-b64d-95841ca0b247',
            name: 'indexpattern-datasource-layer-d5cb6be0-b8e9-446c-b6cd-281572b55130',
          },
        ],
        state: {
          visualization: {
            legend: {
              isVisible: true,
              position: 'right',
            },
            valueLabels: 'hide',
            fittingFunction: 'Linear',
            axisTitlesVisibilitySettings: {
              x: true,
              yLeft: true,
              yRight: true,
            },
            tickLabelsVisibilitySettings: {
              x: true,
              yLeft: true,
              yRight: true,
            },
            labelsOrientation: {
              x: 0,
              yLeft: 0,
              yRight: 0,
            },
            gridlinesVisibilitySettings: {
              x: true,
              yLeft: true,
              yRight: true,
            },
            preferredSeriesType: 'bar_stacked',
            layers: [
              {
                layerId: 'd5cb6be0-b8e9-446c-b6cd-281572b55130',
                accessors: ['eddb2d7c-bba6-4d87-b8ce-ff5d76fe7425'],
                position: 'top',
                seriesType: 'bar_stacked',
                showGridlines: false,
                layerType: 'data',
                colorMapping: {
                  assignments: [],
                  specialAssignments: [
                    {
                      rules: [
                        {
                          type: 'other',
                        },
                      ],
                      color: {
                        type: 'loop',
                      },
                      touched: false,
                    },
                  ],
                  paletteId: 'default',
                  colorMode: {
                    type: 'categorical',
                  },
                },
                xAccessor: '6b3fb6ae-2b5f-43e4-8e30-502614413cb9',
              },
            ],
          },
          query: {
            query: '',
            language: 'kuery',
          },
          filters: [],
          datasourceStates: {
            formBased: {
              layers: {
                'd5cb6be0-b8e9-446c-b6cd-281572b55130': {
                  columns: {
                    '6b3fb6ae-2b5f-43e4-8e30-502614413cb9': {
                      label: 'Top 5 values of extension.keyword',
                      dataType: 'string',
                      operationType: 'terms',
                      sourceField: 'extension.keyword',
                      isBucketed: true,
                      params: {
                        size: 5,
                        orderBy: {
                          type: 'column',
                          columnId: 'eddb2d7c-bba6-4d87-b8ce-ff5d76fe7425',
                        },
                        orderDirection: 'desc',
                        otherBucket: true,
                        missingBucket: false,
                        parentFormat: {
                          id: 'terms',
                        },
                        include: [],
                        exclude: [],
                        includeIsRegex: false,
                        excludeIsRegex: false,
                      },
                    },
                    'eddb2d7c-bba6-4d87-b8ce-ff5d76fe7425': {
                      label: 'Count of records',
                      dataType: 'number',
                      operationType: 'count',
                      isBucketed: false,
                      sourceField: '___records___',
                      params: {
                        emptyAsNull: true,
                      },
                    },
                  },
                  columnOrder: [
                    '6b3fb6ae-2b5f-43e4-8e30-502614413cb9',
                    'eddb2d7c-bba6-4d87-b8ce-ff5d76fe7425',
                  ],
                  incompleteColumns: {},
                  sampling: 1,
                },
              },
            },
            indexpattern: {
              layers: {},
            },
            textBased: {
              layers: {},
            },
          },
          internalReferences: [],
          adHocDataViews: {},
        },
      },
    },
    references: [],
  },
};

// Recursively update any references in deeply nested object
const updateReferences = (json: any, references: any[]) => {
  json.serializedState.rawState.attributes.references = references;
  return json;
};

export const CreateWithAIFlyout = ({
  modalTitleId,
  dashboardApi,
}: {
  modalTitleId: string;
  dashboardApi: CanAddNewPanel;
}) => {
  const [text, setText] = useState(PLACEHOLDER_USER_PROMPT);
  const [response, setResponse] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  useEffect(() => {
    console.log(`--@@getSerializedState`, dashboardApi);
    // @TODO: remove
    console.log(`--@@getSerializedState()`, dashboardApi.getSerializedState());
  }, [dashboardApi]);
  const executeCreateWithAI = useCallback(async () => {
    try {
      setIsLoading(true);
      const defaultConnectorId = await coreServices.uiSettings.get('genAI:defaultConnectorId');
      // @TODO: remove
      console.log(`--@@dashboardApi`, dashboardApi);
      const resp = await inferenceService?.chatComplete({
        connectorId: defaultConnectorId,
        system: `You are a helpful assistant for Elastic. Given a user prompt, you will return a JSON object with the dashboard configuration. The visualizationType should be one of the following: "lnsDatatable" | "lnsXY". The JSON should following the following schema:
${JSON.stringify(PLACEHOLDER_JSON)}`,
        messages: [
          {
            role: MessageRole.User,
            content: text || PLACEHOLDER_USER_PROMPT,
          },
        ],
      });

      console.log(`--@@resp`, resp);

      // Parse content that starts wiht ```json and ends with ```
      let jsonContent = resp.content.match(/```json\n(.*)\n```/s);
      jsonContent = JSON.parse(jsonContent[1]);
      // const jsonContent = PLACEHOLDER_JSON;
      if (jsonContent) {
        const json = jsonContent; // JSON.parse(jsonContent[1]);]
        // Recursively assign 'references' in json with constant
        const updatedJson = updateReferences(json, [
          {
            type: 'index-pattern',
            id: '90943e30-9a47-11e8-b64d-95841ca0b247',
            name: 'indexpattern-datasource-layer-d5cb6be0-b8e9-446c-b6cd-281572b55130',
          },
        ]);
        // @TODO: remove
        console.log(`--@@updatedJson`, updatedJson);

        const embeddable = await dashboardApi.addNewPanel(updatedJson, true);
      }
      // Handle chatResponse if needed
    } catch (e) {
      console.log(`--@@e`, e);
      // Handle error if needed
    } finally {
      setIsLoading(false);
    }
  }, [text, dashboardApi]);
  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2 id={modalTitleId}>
            {i18n.translate('embeddableApi.addPanel.Title', { defaultMessage: 'Create with AI' })}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiTextArea
          fullWidth
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value.trim())}
          placeholder={i18n.translate('dashboard.createWithAI.placeholder', {
            defaultMessage: 'Example: {placeholder}"',
            values: { placeholder: PLACEHOLDER_USER_PROMPT },
          })}
        />
        <EuiButton isLoading={isLoading} onClick={executeCreateWithAI}>
          Generate visualization
        </EuiButton>
      </EuiFlyoutBody>
    </>
  );
};
export async function createWithAI(dashboardApi: DashboardApi) {
  openLazyFlyout({
    core: coreServices,
    parentApi: dashboardApi,
    loadContent: async ({ ariaLabelledBy }) => {
      return <CreateWithAIFlyout dashboardApi={dashboardApi} modalTitleId={ariaLabelledBy} />;
    },
    flyoutProps: {
      'data-test-subj': 'dashboardCreateWithAIFlyout',
      triggerId: 'createWithAIButton',
    },
  });
}

export function DashboardEditingToolbar({ isDisabled }: { isDisabled?: boolean }) {
  const { euiTheme } = useEuiTheme();

  const isMounted = useMountedState();
  const dashboardApi = useDashboardApi();
  const [isLoading, setIsLoading] = useState(false);

  const controlGroupApi = useStateFromPublishingSubject(dashboardApi.controlGroupApi$);
  const extraButtons = [
    <AddPanelButton isDisabled={isDisabled} />,
    <AddFromLibraryButton
      onClick={() => addFromLibrary(dashboardApi)}
      size="s"
      data-test-subj="dashboardAddFromLibraryButton"
      isDisabled={isDisabled}
    />,
    <ControlsToolbarButton isDisabled={isDisabled} controlGroupApi={controlGroupApi} />,
    <ToolbarButton
      type="secondary"
      isDisabled={isDisabled || isLoading}
      isLoading={isLoading}
      iconType="lensApp"
      size="s"
      onClick={async () => {
        setIsLoading(true);

        await createWithAI(dashboardApi);
        // await executeAddLensPanelAction(dashboardApi);
        if (isMounted()) {
          setIsLoading(false);
        }
      }}
      label={'Create with AI'}
      data-test-subj="dashboardAddNewPanelButton"
    />,
  ];

  return (
    <div
      css={css`
        padding: 0 ${euiTheme.size.s} ${euiTheme.size.s} ${euiTheme.size.s};
      `}
    >
      <Toolbar>
        {{
          primaryButton: (
            <ToolbarButton
              type="primary"
              isDisabled={isDisabled || isLoading}
              isLoading={isLoading}
              iconType="lensApp"
              size="s"
              onClick={async () => {
                setIsLoading(true);
                await executeAddLensPanelAction(dashboardApi);
                if (isMounted()) {
                  setIsLoading(false);
                }
              }}
              label={getCreateVisualizationButtonTitle()}
              data-test-subj="dashboardAddNewPanelButton"
            />
          ),
          extraButtons,
        }}
      </Toolbar>
    </div>
  );
}
