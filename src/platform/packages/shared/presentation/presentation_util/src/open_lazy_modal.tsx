/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React from 'react';
import type { CoreStart } from '@kbn/core/public';
import { toMountPoint } from '@kbn/react-kibana-mount';
import useAsync from 'react-use/lib/useAsync';

import { LoadingModal } from './loading_modal';

interface LoadContentArgs {
  closeModal: () => void;
}

interface OpenLazyModalParams {
  core: CoreStart;
  loadContent: (args: LoadContentArgs) => Promise<React.JSX.Element | null | void>;
  onClose?: () => void;
}

export const openLazyModal = ({
  core,
  loadContent,
  onClose: onCloseCallback,
}: OpenLazyModalParams): void => {
  let overlayRef: ReturnType<typeof core.overlays.openModal> | undefined;

  const closeModal = () => {
    overlayRef?.close();
    onCloseCallback?.();
  };

  overlayRef = core.overlays.openModal(
    toMountPoint(<LazyModal loadContent={loadContent} closeModal={closeModal} />, core)
  );
};

function LazyModal({
  loadContent,
  closeModal,
}: {
  loadContent: OpenLazyModalParams['loadContent'];
  closeModal: () => void;
}) {
  const [LoadedModal, setLoadedModal] = React.useState<React.JSX.Element | null>(null);

  useAsync(async () => {
    const result = await loadContent({ closeModal });
    if (result) {
      setLoadedModal(result);
    } else {
      closeModal();
    }
  }, []);

  return LoadedModal ?? <LoadingModal onClose={closeModal} />;
}
