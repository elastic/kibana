/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiButton } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { DataViewField } from '../../../../../../data_views/public';
import { VisualizeInformation } from './lib/visualize_trigger_utils';

interface DiscoverFieldVisualizeInnerProps {
  field: DataViewField;
  visualizeInfo: VisualizeInformation;
  handleVisualizeLinkClick: (event: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => void;
}

export const DiscoverFieldVisualizeInner = (props: DiscoverFieldVisualizeInnerProps) => {
  const { field, visualizeInfo, handleVisualizeLinkClick } = props;
  return (
    // eslint-disable-next-line @elastic/eui/href-or-on-click
    <EuiButton
      fullWidth
      size="s"
      href={visualizeInfo.href}
      onClick={handleVisualizeLinkClick}
      data-test-subj={`fieldVisualize-${field.name}`}
    >
      <FormattedMessage
        id="discover.fieldChooser.visualizeButton.label"
        defaultMessage="Visualize"
      />
    </EuiButton>
  );
};
