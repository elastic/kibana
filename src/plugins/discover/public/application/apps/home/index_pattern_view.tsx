/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { EuiCard, EuiFlexGrid, EuiFlexItem, EuiIcon, EuiText } from '@elastic/eui';
import React, { useState } from "react";
import './discover_view.scss';
import { DataView } from 'src/plugins/data/common';
import { LoadingIndicator } from '../../components/common/loading_indicator';
import { useIndexPatternData } from '../../helpers/use_index_pattern_data';

interface IndexPatternViewProps {
  indexPattern: DataView | undefined;
  services: DiscoverServices;
}

export function IndexPatternView(props: IndexPatternViewProps) {
  const { indexPattern, services } = props;
  const [nrOfDocuments, setNrOfDocuments] = useState<number>(0);

  const onResult = (totalNrOfHits: number) => {
    setNrOfDocuments(totalNrOfHits);
  };

  useIndexPatternData(indexPattern, services, onResult, () => {});

  if (!indexPattern) {
    return <LoadingIndicator />;
  }
  const { description } = indexPattern;
  const descriptionText = description && description.length > 0 ? description : '[No Description]';

  return (
    <EuiCard
      layout="horizontal"
      icon={<EuiIcon size="m" type={'discoverApp'} className="discoverLogo__icon" />}
      titleSize="s"
      title={indexPattern.title}
      description={descriptionText}
      onClick={() => {}}
    >
      <EuiFlexGrid>
        <EuiFlexItem>
          <EuiIcon size="s" type={'documents'} style={{ marginTop: '5px' }} />
        </EuiFlexItem>
        <EuiFlexItem style={{ marginLeft: '-4px' }}>
          <EuiText size="s">{`${nrOfDocuments} documents`}</EuiText>
        </EuiFlexItem>
      </EuiFlexGrid>
    </EuiCard>
  );
}
