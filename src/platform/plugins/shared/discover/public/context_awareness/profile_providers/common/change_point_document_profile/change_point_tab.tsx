/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo } from 'react';
import { EuiText, useEuiTheme } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { BehaviorSubject } from 'rxjs';
import useObservable from 'react-use/lib/useObservable';
import type { DocViewActions, DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import {
  ChangePointLensEmbeddable,
  changePointExperienceLensWrapperCss,
} from '../change_point_data_source_profile/change_point_lens_embeddable';
import type { ChangePointLensDocContext } from '../change_point_data_source_profile/change_point_context';

export interface ChangePointTabProps extends DocViewRenderProps {
  docViewActions?: DocViewActions;
  changePointLensContext$: BehaviorSubject<ChangePointLensDocContext | undefined>;
}

export const ChangePointTab: React.FC<ChangePointTabProps> = ({ hit, changePointLensContext$ }) => {
  const { lens, data } = useDiscoverServices();
  const { euiTheme } = useEuiTheme();
  const chartWrapperCss = useMemo(() => changePointExperienceLensWrapperCss(euiTheme), [euiTheme]);

  const lensDocContext = useObservable(changePointLensContext$, changePointLensContext$.getValue());

  const changePointLensAttributes = lensDocContext?.lensAttributesByRecordId[hit.id];
  const fetchSlice = lensDocContext?.fetchSlice;

  const handleBrushEnd = useCallback(
    (event: { preventDefault: () => void; range?: number[] }) => {
      event.preventDefault();
      if (event.range?.length && event.range.length >= 2) {
        const [min, max] = event.range;
        data.query.timefilter.timefilter.setTime({
          from: new Date(min).toISOString(),
          to: new Date(max).toISOString(),
          mode: 'absolute',
        });
      }
    },
    [data.query.timefilter.timefilter]
  );

  if (changePointLensAttributes && fetchSlice) {
    return (
      <ChangePointLensEmbeddable
        lens={lens}
        attributes={changePointLensAttributes}
        executionContextDescription="Discover change point document tab chart"
        id={`discover-change-point-doc-tab-lens-${hit.id}`}
        abortController={fetchSlice.abortController}
        lastReloadRequestTime={fetchSlice.lastReloadRequestTime}
        searchSessionId={fetchSlice.searchSessionId}
        timeRange={fetchSlice.timeRange}
        onBrushEnd={handleBrushEnd}
        syncCursor={false}
        syncTooltips={false}
        wrapperCss={chartWrapperCss}
        dataTestSubj="changePointDocTabLensChart"
      />
    );
  }

  return (
    <EuiText size="s" color="subdued">
      <FormattedMessage
        id="discover.contextAwareness.changePointTab.placeholder"
        defaultMessage="Change point chart for this row is not available yet. Ensure the chart section is visible and results have finished loading."
      />
    </EuiText>
  );
};
