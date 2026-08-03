import type React from 'react';
import type { List } from 'react-virtualized';
import type { TraceWaterfallItem } from './use_trace_waterfall';
export declare function useScrollToOrigin({ contextSpanId, visibleList, listRef, scrollToOriginRef, setIsContextSpanVisible, }: {
    contextSpanId?: string;
    visibleList: TraceWaterfallItem[];
    listRef: React.RefObject<List>;
    scrollToOriginRef: React.MutableRefObject<() => void>;
    setIsContextSpanVisible: (visible: boolean) => void;
}): {
    onScrolled: ({ startIndex, stopIndex }: {
        startIndex: number;
        stopIndex: number;
    }) => void;
};
