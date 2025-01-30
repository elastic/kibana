/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { cloneDeep } from 'lodash';
import { BehaviorSubject } from 'rxjs';
import React, { useEffect, useMemo, useState, type FC } from 'react';

import {
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlyoutBody,
  EuiForm,
  EuiFormRow,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutFooter,
} from '@elastic/eui';

import { CodeEditor } from '@kbn/code-editor';
import { euiThemeVars } from '@kbn/ui-theme';
import type { CoreStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { StartServicesAccessor } from '@kbn/core-lifecycle-browser';
import type {
  DefaultEmbeddableApi,
  EmbeddableSetup,
  ReactEmbeddableFactory,
} from '@kbn/embeddable-plugin/public';
import { tracksOverlays } from '@kbn/presentation-containers';
import { toMountPoint } from '@kbn/react-kibana-mount';
import type {
  HasEditCapabilities,
  PublishesDataViews,
  PublishesTimeRange,
  PublishingSubject,
  SerializedTimeRange,
  SerializedTitles,
  StateComparators,
} from '@kbn/presentation-publishing';
import {
  apiHasExecutionContext,
  initializeTimeRange,
  initializeTitleManager,
  useBatchedPublishingSubjects,
} from '@kbn/presentation-publishing';
import { dashboardCrossfilterSlice } from '@kbn/eventbus-slices';

import { JsSandboxComponent } from './js_sandbox_component';
import type { JsSandboxPluginStart, JsSandboxPluginStartDeps } from './types';

export function registerEmbeddable(
  embeddable: EmbeddableSetup,
  getStartServices: StartServicesAccessor<JsSandboxPluginStartDeps, JsSandboxPluginStart>
) {
  embeddable.registerReactEmbeddableFactory('js_sandbox', async () =>
    getJsSandboxEmbeddableFactory(getStartServices)
  );
}

export interface JsSandboxEmbeddableState extends SerializedTitles, SerializedTimeRange {
  esql: string;
  hashedJS: string;
}

export type JsSandboxEmbeddableApi = DefaultEmbeddableApi<JsSandboxEmbeddableState> &
  HasEditCapabilities &
  PublishesDataViews &
  PublishesTimeRange &
  JsSandboxComponentApi;

export interface JsSandboxComponentApi {
  esql: PublishingSubject<JsSandboxEmbeddableState['esql']>;
  hashedJS: PublishingSubject<JsSandboxEmbeddableState['hashedJS']>;
  updateUserInput: (update: JsSandboxEmbeddableState) => void;
}

export type JsSandboxEmbeddableCustomState = Omit<
  JsSandboxEmbeddableState,
  'timeRange' | 'title' | 'description' | 'hidePanelTitles'
>;

const initializeJsSandboxControls = (rawState: JsSandboxEmbeddableState) => {
  const esql = new BehaviorSubject(rawState.esql);
  const hashedJS = new BehaviorSubject(rawState.hashedJS);

  const updateUserInput = (update: JsSandboxEmbeddableCustomState) => {
    esql.next(update.esql);
    hashedJS.next(update.hashedJS);
  };

  const serializeJsSandboxChartState = (): JsSandboxEmbeddableCustomState => {
    return {
      esql: esql.getValue(),
      hashedJS: hashedJS.getValue(),
    };
  };

  const jsSandboxControlsComparators: StateComparators<JsSandboxEmbeddableCustomState> = {
    esql: [esql, (arg) => esql.next(arg)],
    hashedJS: [hashedJS, (arg) => hashedJS.next(arg)],
  };

  return {
    jsSandboxControlsApi: { esql, hashedJS, updateUserInput } as unknown as JsSandboxComponentApi,
    serializeJsSandboxChartState,
    jsSandboxControlsComparators,
  };
};

export interface JsSandboxEmbeddableInitializerProps {
  initialInput?: Partial<JsSandboxEmbeddableState>;
  onCreate: (props: JsSandboxEmbeddableState) => void;
  onCancel: () => void;
  onPreview: (update: JsSandboxEmbeddableState) => Promise<void>;
  isNewPanel: boolean;
}

const JsSandboxEmbeddableInitializer: FC<JsSandboxEmbeddableInitializerProps> = ({
  initialInput,
  onCreate,
  onCancel,
  onPreview,
  isNewPanel,
}) => {
  const [formInput, setFormInput] = useState<JsSandboxEmbeddableState>(
    (initialInput ?? {
      esql: '',
      hashedJS: `function() {
        return <p>Here be dragons.</p>
      }`,
    }) as JsSandboxEmbeddableState
  );
  const [isFormValid, setIsFormValid] = useState(true);

  const updatedProps = useMemo(() => {
    return {
      ...formInput,
      title: i18n.translate('jsSandbox.embeddable.attachmentTitle', {
        defaultMessage: 'JS Sandbox',
      }),
    };
  }, [formInput]);

  function previewChanges() {
    if (isFormValid && updatedProps.hashedJS !== undefined) {
      onPreview(updatedProps);
    }
  }

  return (
    <>
      <EuiFlyoutHeader
        hasBorder={true}
        css={{
          pointerEvents: 'auto',
          backgroundColor: euiThemeVars.euiColorEmptyShade,
        }}
      >
        <EuiTitle size="s" data-test-subj="inlineEditingFlyoutLabel">
          <h2>
            {isNewPanel
              ? i18n.translate('jsSandbox.embeddable.config.title.new', {
                  defaultMessage: 'Create JS sandbox',
                })
              : i18n.translate('jsSandbox.embeddable.config.title.edit', {
                  defaultMessage: 'Edit JS sandbox',
                })}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EuiForm>
          <FormControls
            formInput={formInput}
            onChange={setFormInput}
            onValidationChange={setIsFormValid}
          />
          <EuiButton
            size="s"
            onClick={() => previewChanges()}
            aria-label={i18n.translate('jsSandbox.embeddable.config.previewFlyoutAriaLabel', {
              defaultMessage: 'Preview',
            })}
            isDisabled={!isFormValid}
            data-test-subj="jsSandboxEmbeddableConfigPreviewButton"
          >
            <FormattedMessage
              id="jsSandbox.embeddable.config.previewLabel"
              defaultMessage="Preview"
            />
          </EuiButton>
        </EuiForm>
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              color="primary"
              size="m"
              onClick={onCancel}
              data-test-subj="jsSandboxEmbeddableConfigCancelButton"
            >
              <FormattedMessage
                id="jsSandbox.embeddable.config.cancelButtonLabel"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              onClick={onCreate.bind(null, updatedProps)}
              fill
              aria-label={i18n.translate('jsSandbox.embeddable.config.applyFlyoutAriaLabel', {
                defaultMessage: 'Apply changes',
              })}
              isDisabled={!isFormValid}
              iconType="check"
              data-test-subj="jsSandboxEmbeddableConfigConfirmButton"
            >
              <FormattedMessage
                id="jsSandbox.embeddable.config.applyAndCloseLabel"
                defaultMessage="Apply and close"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};

const FormControls: FC<{
  formInput: JsSandboxEmbeddableState;
  onChange: (update: JsSandboxEmbeddableState) => void;
  onValidationChange: (isValid: boolean) => void;
}> = ({ formInput, onChange, onValidationChange }) => {
  const [esql, setEsql] = useState(formInput.esql);
  const [hashedJS, setHashedJS] = useState(formInput.hashedJS);

  useEffect(() => {
    onChange({ ...formInput, hashedJS });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hashedJS]);

  useEffect(() => {
    onChange({ ...formInput, esql });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [esql]);

  return (
    <>
      <EuiFormRow
        label={i18n.translate('jsSandbox.embeddable.config.esqlLabel', {
          defaultMessage: 'ES|QL',
        })}
        helpText={i18n.translate('jsSandbox.embeddable.config.esqlHelpText', {
          defaultMessage: 'See the ES|QL documentation for more information.',
        })}
        isInvalid={false}
        error={[]}
      >
        <CodeEditor
          height={150}
          languageId="esql"
          options={{
            automaticLayout: true,
            lineNumbers: 'off',
            tabSize: 2,
          }}
          value={esql}
          onChange={setEsql}
          data-test-subj="jsSandboxEmbeddableConfigEsql"
        />
      </EuiFormRow>
      <EuiFormRow
        label={i18n.translate('jsSandbox.embeddable.config.hashedJSLabel', {
          defaultMessage: 'JS component',
        })}
        helpText={i18n.translate('jsSandbox.embeddable.config.hashedJSHelpText', {
          defaultMessage: 'Your custom component. Supports JSX.',
        })}
        isInvalid={false}
        error={[]}
      >
        <CodeEditor
          height={300}
          languageId="javascript"
          options={{
            automaticLayout: true,
            lineNumbers: 'off',
            tabSize: 2,
          }}
          value={hashedJS}
          onChange={setHashedJS}
          data-test-subj="jsSandboxEmbeddableConfigHashedJS"
        />
      </EuiFormRow>
    </>
  );
};

export async function resolveEmbeddableJsSandboxUserInput(
  coreStart: CoreStart,
  pluginStart: JsSandboxPluginStartDeps,
  parentApi: unknown,
  focusedPanelId: string,
  isNewPanel: boolean,
  jsSandboxControlsApi: JsSandboxComponentApi,
  deletePanel?: () => void,
  initialState?: JsSandboxEmbeddableState
): Promise<JsSandboxEmbeddableState> {
  const { overlays } = coreStart;

  const overlayTracker = tracksOverlays(parentApi) ? parentApi : undefined;

  let hasChanged = false;
  return new Promise(async (resolve, reject) => {
    try {
      try {
        const cancelChanges = () => {
          if (isNewPanel && deletePanel) {
            deletePanel();
          } else if (hasChanged && jsSandboxControlsApi && initialState) {
            // Reset to initialState in case user has changed the preview state
            jsSandboxControlsApi.updateUserInput(initialState);
          }
          flyoutSession.close();
          overlayTracker?.clearOverlays();
        };
        const update = async (nextUpdate: JsSandboxEmbeddableState) => {
          resolve(nextUpdate);
          flyoutSession.close();
          overlayTracker?.clearOverlays();
        };
        const preview = async (nextUpdate: JsSandboxEmbeddableState) => {
          if (jsSandboxControlsApi) {
            jsSandboxControlsApi.updateUserInput(nextUpdate);
            hasChanged = true;
          }
        };
        const flyoutSession = overlays.openFlyout(
          toMountPoint(
            <JsSandboxEmbeddableInitializer
              initialInput={initialState}
              onCreate={update}
              onCancel={cancelChanges}
              onPreview={preview}
              isNewPanel={isNewPanel}
            />,
            coreStart
          ),
          {
            ownFocus: true,
            size: 's',
            type: 'push',
            paddingSize: 'm',
            hideCloseButton: true,
            'data-test-subj': 'jsSandboxEmbeddableInitializer',
            'aria-labelledby': 'jsSandboxConfig',
            onClose: () => {
              reject();
              flyoutSession.close();
              overlayTracker?.clearOverlays();
            },
          }
        );
        if (tracksOverlays(parentApi)) {
          parentApi.openOverlay(flyoutSession, {
            focusedPanelId,
          });
        }
      } catch (error) {
        reject(error);
      }
    } catch (error) {
      reject(error);
    }
  });
}

export const getJsSandboxEmbeddableFactory = (
  getStartServices: StartServicesAccessor<JsSandboxPluginStartDeps, JsSandboxPluginStart>
) => {
  const factory: ReactEmbeddableFactory<
    JsSandboxEmbeddableState,
    JsSandboxEmbeddableState,
    JsSandboxEmbeddableApi
  > = {
    type: 'js_sandbox',
    deserializeState: (state) => {
      const serializedState = cloneDeep(state.rawState);
      console.log('serializedState', serializedState);
      return serializedState;
    },
    buildEmbeddable: async (state, buildApi, uuid, parentApi) => {
      const [coreStart, pluginStart] = await getStartServices();

      const { data, eventBus } = pluginStart;

      if (eventBus) {
        try {
          eventBus.register(dashboardCrossfilterSlice);
        } catch (e) {
          // console.error('Failed to register event bus', e);
        }
      }

      const dashboardCrossfilter = eventBus.get(dashboardCrossfilterSlice);

      const {
        api: timeRangeApi,
        comparators: timeRangeComparators,
        serialize: serializeTimeRange,
      } = initializeTimeRange(state);

      const titleManager = initializeTitleManager(state);

      const { jsSandboxControlsApi, serializeJsSandboxChartState, jsSandboxControlsComparators } =
        initializeJsSandboxControls(state);

      const dataLoading$ = new BehaviorSubject<boolean | undefined>(true);
      const blockingError$ = new BehaviorSubject<Error | undefined>(undefined);

      const dataViews$ = new BehaviorSubject<DataView[] | undefined>([]);

      const api = buildApi(
        {
          ...titleManager.api,
          dataViews$,
          serializeState: () => {
            return {
              rawState: {
                timeRange: undefined,
                ...titleManager.serialize(),
                ...serializeTimeRange(),
                ...serializeJsSandboxChartState(),
              },
              references: [],
            };
          },
          ...timeRangeApi,
          ...jsSandboxControlsApi,
          getTypeDisplayName: () =>
            i18n.translate('jsSandbox.embeddable.typeDisplayName', {
              defaultMessage: 'js sandbox',
            }),
          isEditingEnabled: () => true,
          onEdit: async () => {
            try {
              const result = await resolveEmbeddableJsSandboxUserInput(
                coreStart,
                pluginStart,
                parentApi,
                uuid,
                false,
                jsSandboxControlsApi,
                undefined,
                serializeJsSandboxChartState()
              );

              jsSandboxControlsApi.updateUserInput(result);
            } catch (e) {
              return Promise.reject();
            }
          },
          dataLoading$,
          blockingError$,
        },
        {
          ...titleManager.comparators,
          ...timeRangeComparators,
          ...jsSandboxControlsComparators,
        }
      );

      return {
        api,
        Component: () => {
          if (!apiHasExecutionContext(parentApi)) {
            throw new Error('Parent API does not have execution context');
          }

          const [esql] = useBatchedPublishingSubjects(api.esql);
          const [hashedJS] = useBatchedPublishingSubjects(api.hashedJS);

          return (
            <JsSandboxComponent
              esql={esql}
              hashedJs={hashedJS}
              crossfilter={dashboardCrossfilter}
              data={data}
            />
          );
        },
      };
    },
  };

  return factory;
};
