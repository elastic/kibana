/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { KibanaContextExtra } from '../types';

export enum DismissableElement {
  OVERRIDE_WARNING_MODAL = 'indexEditor.OverrideWarningDismissed',
}

export const useDontShowMeAgain = () => {
  const {
    services: { storage },
  } = useKibana<KibanaContextExtra>();

  const dontShowMeAgain = (key: DismissableElement) => storage.set(key, true);

  const isElementDismissed = (key: DismissableElement) => {
    return Boolean(storage.get(key));
  };

  return {
    dontShowMeAgain,
    isElementDismissed,
  };
};
