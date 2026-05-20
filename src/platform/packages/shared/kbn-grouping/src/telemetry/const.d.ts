export declare const getTelemetryEvent: {
    groupToggled: ({ isOpen, groupingId, groupNumber, }: {
        isOpen: boolean;
        groupingId: string;
        groupNumber: number;
    }) => string;
    groupChanged: ({ groupingId, selected }: {
        groupingId: string;
        selected: string;
    }) => string;
};
