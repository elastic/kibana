/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useRef, useState } from 'react';
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
  EuiRange,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { LargeDataSetParams, useServices } from './services';

const MIN = 10000;
const MAX = 1000000;
const STEP = 1000;
const INDEX_NAME = 'kibana_sample_data_large';

const title = i18n.translate('homePackages.largeDataSetPanel.title', {
  defaultMessage: 'Generate large data set',
});

const message = i18n.translate('homePackages.largeDataSetPanel.message', {
  defaultMessage:
    'Generate a large data set. Takes about 10 minutes. Turn the switch on to configure the dataset, or leave the switch off to generate a dataset with default parameters',
});

const datasetGeneratedSuccessMessage = i18n.translate(
  'homePackages.largeDataSetPanel.toast.success',
  {
    defaultMessage: 'Dataset successfully generated.',
  }
);

const datasetUninstallErrorMessage = i18n.translate(
  'homePackages.largeDataSetPanel.toast.uninstall.error',
  {
    defaultMessage: 'Error uninstalling dataset',
  }
);

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
  installDataset: (params: LargeDataSetParams) => Promise<void>;
  checkInstalled: () => Promise<boolean>;
  uninstallDataset: () => Promise<void>;
}

enum Status {
  GENERATING = 'generating',
  DONE = 'done',
  UNINSTALLED = 'uninstalled',
}

export const LargeDatasetPanel = ({ installDataset, checkInstalled, uninstallDataset }: Props) => {
  const [imageSrc] = useSVG();
  const [installed, setInstalled] = useState<boolean>(false);
  const [checked, setChecked] = useState<boolean>(false);
  const [nrOfDocuments, setNrOfDocuments] = useState<number>(100000);
  const intervalRef = useRef<ReturnType<typeof setTimeout>>();
  const { notifySuccess, notifyError } = useServices();

  const image = imageSrc ? <EuiImage alt={'demo image'} size="l" src={imageSrc} /> : null;

  useEffect(() => {
    let mounted = true;
    const checkIfInstalled = async () => {
      const responseData = await checkInstalled();
      if (mounted) {
        setInstalled(responseData);
      }
      if (responseData && sessionStorage.getItem(INDEX_NAME) === Status.GENERATING) {
        updateSessionStorage(Status.DONE);
        notifySuccess(datasetGeneratedSuccessMessage);
      }
    };
    checkIfInstalled();
    intervalRef.current = setInterval(checkIfInstalled, 30000); // half a minute
    return () => {
      mounted = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateSessionStorage = (status: Status) => {
    sessionStorage.setItem(INDEX_NAME, status);
  };

  const onInstallClick = async () => {
    try {
      updateSessionStorage(Status.GENERATING);
      installDataset({ nrOfDocuments });
      setInstalled(true);
    } catch {
      notifyError(datasetUninstallErrorMessage);
    }
  };

  const onUninstallClick = async () => {
    try {
      await uninstallDataset();
      setInstalled(false);
      updateSessionStorage(Status.UNINSTALLED);
    } catch {
      notifyError(datasetUninstallErrorMessage);
    }
  };

  const onChange = async () => {
    setChecked(!checked);
  };

  const onNrOfDocumentsChange = (target: EventTarget | (EventTarget & HTMLInputElement)) => {
    setNrOfDocuments(Number((target as HTMLInputElement).value));
  };

  const configureLayout = (
    <EuiPanel>
      <EuiForm component="form">
        <EuiFormRow label="Number of documents">
          <EuiRange
            min={MIN}
            max={MAX}
            step={STEP}
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
          <EuiButton fill onClick={onUninstallClick} target="_blank">
            Uninstall
          </EuiButton>
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
          <EuiButton
            fill
            iconSide="right"
            iconType="popout"
            onClick={onInstallClick}
            target="_blank"
          >
            Generate!
          </EuiButton>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={1} style={{ textAlign: 'center' }}>
        {image}
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  return (
    <EuiPanel hasBorder paddingSize="xl">
      {installed ? installedLayout : uninstalledLayout}
    </EuiPanel>
  );
};
