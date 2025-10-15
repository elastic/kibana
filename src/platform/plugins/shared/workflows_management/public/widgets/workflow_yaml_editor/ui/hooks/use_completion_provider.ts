/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useSelector } from 'react-redux';
import { useMemo } from 'react';
import { selectConnectorsData, selectSchemaLoose, selectWorkflowLookup } from '../../lib/store';
import { getCompletionItemProvider } from '../../lib/get_completion_item_provider';

export const useCompletionProvider = () => {
  const connectorsData = useSelector(selectConnectorsData);
  const workflowYamlSchemaLoose = useSelector(selectSchemaLoose);
  const workflowLookup = useSelector(selectWorkflowLookup);

  const completionProvider = useMemo(() => {
    if (!workflowYamlSchemaLoose) {
      return undefined;
    }

    return getCompletionItemProvider(
      workflowYamlSchemaLoose,
      //   () => {},
      connectorsData?.connectorTypes
    );
  }, [workflowYamlSchemaLoose, connectorsData?.connectorTypes]);

  return completionProvider;
};
