/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { EuiCard, EuiIcon } from '@elastic/eui';
import React from 'react';
import './discover_view.scss';
import { DataView } from 'src/plugins/data/common';
import { LoadingIndicator } from '../../components/common/loading_indicator';

interface IndexPatternViewProps {
  indexPattern: DataView | undefined;
}

export function IndexPatternView(props: IndexPatternViewProps) {
  const { indexPattern } = props;

  if (!indexPattern) {
    return <LoadingIndicator />;
  }
  return (
    <EuiCard
      layout="horizontal"
      icon={<EuiIcon size="m" type={'discoverApp'} className="discoverLogo__icon" />}
      titleSize="s"
      title={indexPattern.title}
      description={indexPattern.description}
      onClick={() => {}}
    />
  );
}
