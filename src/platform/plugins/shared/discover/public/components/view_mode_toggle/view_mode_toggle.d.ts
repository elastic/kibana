import type { ComponentProps } from 'react';
import React, { type ReactElement } from 'react';
import type { DataView } from '@kbn/data-views-plugin/common';
import { VIEW_MODE } from '../../../common/constants';
import { HitsCounter } from '../hits_counter';
export declare const DocumentViewModeToggle: ({ viewMode, isEsqlMode, prepend, setDiscoverViewMode, patternCount, dataView, hitCounterLabel, hitCounterPluralLabel, hitsTotalToDisplay, }: {
    viewMode: VIEW_MODE;
    isEsqlMode: boolean;
    prepend?: ReactElement;
    setDiscoverViewMode: (viewMode: VIEW_MODE, replace?: boolean) => Promise<VIEW_MODE>;
    patternCount?: number;
    dataView: DataView;
} & Pick<ComponentProps<typeof HitsCounter>, "hitCounterLabel" | "hitCounterPluralLabel" | "hitsTotalToDisplay">) => React.JSX.Element;
