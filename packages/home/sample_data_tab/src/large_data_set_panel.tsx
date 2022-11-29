/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiText,
  EuiImage,
  EuiSwitch,
  EuiSpacer,
  EuiForm,
  EuiFormRow,
  EuiFieldText,
  EuiRange,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { LargeDataSetParams } from './services';

const SESSION_KEY = 'large-dataset-indices';

const title = i18n.translate('homePackages.largeDataSetPanel.title', {
  defaultMessage: 'Generate large data set',
});

const message = i18n.translate('homePackages.largeDataSetPanel.message', {
  defaultMessage:
    'Generate a large data set. Takes about 10 minutes. Turn the switch on to configure the dataset, or leave the switch off to generate a dataset with default parameters',
});

const useSVG: () => [string | null, boolean] = () => {
  const { colorMode } = useEuiTheme();
  const ref = useRef<string | null>(null);
  const [loading, setLoading] = useState(false);
  const isDark = colorMode === 'DARK';

  useEffect(() => {
    setLoading(true);
    const load = async () => {
      try {
        if (isDark) {
          const { default: svg } = await import('./assets/large-dataset--dark.png');
          ref.current = svg;
        } else {
          const { default: svg } = await import('./assets/large-dataset--light.png');
          ref.current = svg;
        }
      } catch (e) {
        throw e;
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isDark]);

  return [ref.current, loading];
};

interface Props {
  install: (params: LargeDataSetParams) => Promise<void>;
  checkInstalled: () => Promise<boolean>;
}

export const LargeDatasetPanel = ({ install, checkInstalled }: Props) => {
  const [imageSrc] = useSVG();
  const [installed, setInstalled] = useState<boolean>(false);
  const [checked, setChecked] = useState<boolean>(false);
  const [indexName, setIndexName] = useState<string>('kibana_sample_data_large');
  const [nrOfDocuments, setNrOfDocuments] = useState<number>(100000);

  const image = imageSrc ? <EuiImage alt={'demo image'} size="l" src={imageSrc} /> : null;

  const updateSessionStorage = () => {
    const sessionItems = sessionStorage.getItem(SESSION_KEY);
    if (!sessionItems) {
      return;
    }
    const indices = JSON.parse(sessionItems);
    indices.push(indexName);
    sessionStorage.setItem(SESSION_KEY, indices);
  };

  const onClick = async () => {
    updateSessionStorage();
    await install({ indexName, nrOfDocuments });
    setInstalled(true);
  };

  const onChange = async () => {
    setChecked(!checked);
  };

  const onIndexNameChange = (val: string) => {
    if (!val.trim().startsWith('kibana_sample_data_')) {
      return;
    }
    setIndexName(val);
  };

  const onNrOfDocumentsChange = (target: EventTarget | (EventTarget & HTMLInputElement)) => {
    setNrOfDocuments(Number((target as HTMLInputElement).value));
  };

  const configureLayout = (
    <EuiPanel>
      <EuiForm component="form">
        <EuiFormRow label="Index name" helpText="Elasticsearch index to generate">
          <EuiFieldText
            name="indexName"
            value={indexName}
            onChange={(e) => onIndexNameChange(e.target.value)}
          />
        </EuiFormRow>
        <EuiFormRow label="Number of documents">
          <EuiRange
            min={1000}
            max={100000}
            step={1000}
            value={nrOfDocuments}
            onChange={(e) => onNrOfDocumentsChange(e.target)}
            showLabels
            showValue
          />
        </EuiFormRow>
      </EuiForm>
      <EuiSpacer />
    </EuiPanel>
  );

  const installedLayout = (
    <EuiFlexGroup alignItems="center">
      <EuiFlexItem grow={1}>
        <EuiText size="s">
          <h2>Large dataset installed or installation is in progress</h2>
          <p>You will be able to see your data in Discover once it is ready</p>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={1} style={{ textAlign: 'center' }}>
        {image}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
  const uninstalledLayout = (
    <EuiFlexGroup alignItems="center">
      <EuiFlexItem grow={1}>
        <EuiText size="s">
          <h2>{title}</h2>
          <p>{message}</p>
          <EuiSwitch label="Configure your own data set" checked={checked} onChange={onChange} />
          <EuiSpacer />
          {checked ? configureLayout : null}
          {checked ? <EuiSpacer /> : null}
          <EuiButton fill iconSide="right" iconType="popout" onClick={onClick} target="_blank">
            Generate!
          </EuiButton>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={1} style={{ textAlign: 'center' }}>
        {image}
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  const getDatasetInstalledStatus = useCallback(async () => {
    const installStatus = await checkInstalled();
    setInstalled(installStatus);
  }, [checkInstalled]);

  useEffect(() => {
    getDatasetInstalledStatus();
  }, [getDatasetInstalledStatus]);

  return (
    <EuiPanel hasBorder paddingSize="xl">
      {installed ? installedLayout : uninstalledLayout}
    </EuiPanel>
  );
};
