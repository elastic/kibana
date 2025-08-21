/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { Fragment, useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import type { CoreStart } from '@kbn/core/public';
import type { Logger } from '@kbn/logging';
import type { ZitherPublicPluginStart } from '@kbn/zither-plugin/public';
import * as webllm from '@mlc-ai/web-llm';
import {
  EuiCallOut,
  EuiLink,
  EuiSuperSelect,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { Observable } from 'rxjs';

interface OnDeviceExampleAppProps {
  coreStart: CoreStart;
  zither: ZitherPublicPluginStart;
  logger: Logger;
}

export const OnDeviceExampleApp = ({ coreStart, zither, logger }: OnDeviceExampleAppProps) => {
  /* *
   * Application configuration for the MLC Engine
   * see {@link https://llm.mlc.ai/docs/deploy/webllm.html here} for information on specifying models
   */
  const appConfig = useRef<webllm.AppConfig>({
    ...webllm.prebuiltAppConfig,
    model_list: ([] as webllm.ModelRecord[]).concat(
      // Valid filter options include; gemma-2, llama, qwen
      webllm.prebuiltAppConfig.model_list.filter((model) => model.model_id.includes('gemma-2'))
    ),
  });
  const mlcEngine =
    useRef<ReturnType<ZitherPublicPluginStart['mlcEngine']> extends Promise<infer V> ? V : never>();
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [initializationReport, setInitializationReport] = useState<null | { progress: number }>();
  const zitherStateSubscription = useRef<ReturnType<typeof zither.state.subscribe> | null>(null);
  const [zitherState, setZitherState] =
    useState<ZitherPublicPluginStart['state'] extends Observable<infer V> ? V : null>(null);

  useEffect(() => {
    if (!zitherStateSubscription.current) {
      zitherStateSubscription.current = zither.state.subscribe(setZitherState);
    }

    return () => {
      zitherStateSubscription.current?.unsubscribe();
    };
  }, [zither]);

  useEffect(() => {
    const provisionMLCEngine = async () => {
      try {
        mlcEngine.current = await zither.mlcEngine(selectedModelId!, {
          appConfig: appConfig.current,
          initProgressCallback: (report) => {
            logger.debug(`MLC Engine initialization progress: ${report.progress}`);
            setInitializationReport(report);
          },
          logLevel: 'TRACE',
        });
      } catch (err) {
        logger.error(`MLC Engine initialization error: ${err.toString()}`);
      }
    };

    if (zitherState === 'activated' && selectedModelId && !mlcEngine.current) {
      logger.info('Initializing MLC Engine...');
      // provision or reload the MLC Engine
      provisionMLCEngine().then(() => {
        logger.info('MLC Engine initialized successfully.');
      });
    }

    return () => {
      // terminate MLC Engine??
    };
  }, [logger, zither, zitherState, selectedModelId]);

  return coreStart.rendering.addContext(
    <div>
      <EuiCallOut color="accent" title="On Device LLM Example App">
        <EuiFlexGroup alignItems="center" direction="row" gutterSize="s">
          <EuiFlexItem grow={7}>
            <p>
              <FormattedMessage
                id="onDeviceExampleApp.callout.description"
                defaultMessage="Orchestrated with the Zither Plugin, Powered by <link>mlc</link>"
                values={{
                  link: (chunks) => (
                    <EuiLink external target="_blank" href="https://github.com/mlc-ai/web-llm">
                      {chunks}
                    </EuiLink>
                  ),
                }}
              />
            </p>
          </EuiFlexItem>
          <EuiFlexItem css={{ justifySelf: 'flex-end' }} grow={3}>
            <EuiFormRow
              fullWidth
              helpText={
                zitherState
                  ? 'Select a model to use with the MLC Engine'
                  : 'Engine orchestrator is unavailable, was a hard refresh performed?'
              }
            >
              <EuiSuperSelect
                fullWidth
                disabled={!zitherState || zitherState !== 'activated'}
                options={appConfig.current.model_list.map((model) => ({
                  value: model.model_id,
                  inputDisplay: model.model_id,
                  dropdownDisplay: (
                    <Fragment>
                      <strong>{model.model_id}</strong>
                      <EuiText size="s" color="subdued">
                        <p>{`Requires VRAM of ${(model.vram_required_MB / 1024).toFixed(2)}GB`}</p>
                      </EuiText>
                    </Fragment>
                  ),
                }))}
                onChange={(value) => {
                  mlcEngine.current = undefined; // reset the engine on model change
                  setSelectedModelId(value);
                  setInitializationReport(null);
                }}
                valueOfSelected={selectedModelId ?? undefined}
                aria-label="Select a model"
              />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiFlexGroup>
          <EuiFlexItem>
            {initializationReport && (
              <div>
                <h2>MLC Engine Initialization Report</h2>
                <pre>{JSON.stringify(initializationReport, null, 2)}</pre>
              </div>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiCallOut>
    </div>
  );
};

export const renderOnDeviceExampleApp = (container: HTMLElement, deps: OnDeviceExampleAppProps) => {
  ReactDOM.render(<OnDeviceExampleApp {...deps} />, container);

  return () => {
    ReactDOM.unmountComponentAtNode(container);
  };
};
