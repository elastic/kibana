/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, Fragment, useMemo } from 'react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiBadge,
  EuiSuperSelect,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import type { Pipeline } from '@kbn/ingest-pipelines-plugin/public';
import { DEFAULT_INGESTION_PIPELINE } from '../constants';

interface OptionItem {
  value: string;
  inputDisplay: string;
  dropdownDisplay: JSX.Element;
}

interface IngestPipelinePanelProps {
  setSelectedPipeline: (pipeline: string) => void;
  ingestPipelineData?: Pipeline[] | null;
}

export const IngestPipelinePanel: React.FC<IngestPipelinePanelProps> = ({
  setSelectedPipeline,
  ingestPipelineData,
}) => {
  const options = useMemo(() => {
    return ingestPipelineData
      ? ingestPipelineData.map(
          (item): OptionItem => ({
            value: item.name,
            inputDisplay: item.name,
            dropdownDisplay: (
              <Fragment>
                <strong>{item.name}</strong>
                <EuiFlexGroup
                  gutterSize="s"
                  alignItems="center"
                  data-test-subj="ingestPipelinePanelProcessors"
                >
                  <EuiFlexItem grow={false}>
                    <EuiText size="s" color="subdued">
                      <p>{`${item.processors.length} ${
                        item.processors.length > 1 ? 'processors' : 'processor'
                      }`}</p>
                    </EuiText>
                  </EuiFlexItem>
                  {item.isManaged && (
                    <EuiFlexItem grow={false}>
                      <EuiBadge>Managed</EuiBadge>
                    </EuiFlexItem>
                  )}
                  {item.name === DEFAULT_INGESTION_PIPELINE && (
                    <EuiFlexItem grow={false}>
                      <EuiBadge color="primary">Recommended</EuiBadge>
                    </EuiFlexItem>
                  )}
                </EuiFlexGroup>
              </Fragment>
            ),
          })
        )
      : [];
  }, [ingestPipelineData]);

  const [selected, setSelected] = useState<string>();

  const onChange = (value: string) => {
    setSelected(value);
    setSelectedPipeline(value);
  };

  return (
    <>
      <EuiFlexGroup gutterSize="s" data-test-subj="ingestPipelinePanelTitle">
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <strong>
              {i18n.translate(
                'xpack.serverlessSearch.indexManagement.indexDetails.pipelinePanel.title',
                {
                  defaultMessage: 'Preprocess your data',
                }
              )}
            </strong>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge>Optional</EuiBadge>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="xs" />
      <EuiText data-test-subj="ingestPipelinePanelBody">
        <p>
          {i18n.translate(
            'xpack.serverlessSearch.indexManagement.indexDetails.pipelinePanel.description',
            {
              defaultMessage:
                'You can use ingest pipelines to preprocess data before indexing into Elasticsearch.',
            }
          )}
        </p>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiSuperSelect
        options={options}
        valueOfSelected={selected}
        placeholder="Select a pipeline"
        onChange={(value) => onChange(value)}
        itemLayoutAlign="top"
        hasDividers
        data-test-subj="ingestPipelinePanelSelect"
      />
      <EuiSpacer size="m" />
    </>
  );
};
