import type { ControlGroupRendererProps } from './control_group_renderer';
export declare const usePropsApi: ({ viewMode, dataLoading, compressed, }: Pick<ControlGroupRendererProps, "viewMode" | "dataLoading" | "compressed">) => {
    isCompressed: () => boolean;
    setViewMode: (value: unknown) => void;
    setDataLoading: (value: unknown) => void;
    viewMode$: import("@kbn/presentation-publishing").PublishingSubject<unknown>;
    dataLoading$: import("@kbn/presentation-publishing").PublishingSubject<unknown>;
};
