interface DataStreamResponse {
    data_streams?: Array<{
        name: string;
        indices: Array<{
            index_name: string;
        }>;
    }>;
}
export declare class DataStream {
    private dataStreams;
    perDataStreamIndices: Record<string, string[]>;
    getDataStreams: () => string[];
    loadDataStreams: (dataStreams: DataStreamResponse) => void;
    clearDataStreams: () => void;
}
export {};
