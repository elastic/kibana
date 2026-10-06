export declare const fieldMappings: {
    request: {
        type: string;
    };
    geo: {
        properties: {
            srcdest: {
                type: string;
            };
            src: {
                type: string;
            };
            dest: {
                type: string;
            };
            coordinates: {
                type: string;
            };
        };
    };
    utc_time: {
        type: string;
    };
    url: {
        type: string;
    };
    message: {
        type: string;
        fields: {
            keyword: {
                type: string;
                ignore_above: number;
            };
        };
    };
    host: {
        type: string;
        fields: {
            keyword: {
                type: string;
                ignore_above: number;
            };
        };
    };
    clientip: {
        type: string;
    };
    response: {
        type: string;
        fields: {
            keyword: {
                type: string;
                ignore_above: number;
            };
        };
    };
    machine: {
        properties: {
            ram: {
                type: string;
            };
            os: {
                type: string;
                fields: {
                    keyword: {
                        type: string;
                        ignore_above: number;
                    };
                };
            };
        };
    };
    agent: {
        type: string;
        fields: {
            keyword: {
                type: string;
                ignore_above: number;
            };
        };
    };
    bytes: {
        type: string;
    };
    tags: {
        type: string;
        fields: {
            keyword: {
                type: string;
                ignore_above: number;
            };
        };
    };
    referer: {
        type: string;
    };
    ip: {
        type: string;
    };
    '@timestamp': {
        type: string;
    };
    timestamp: {
        type: string;
        path: string;
    };
    phpmemory: {
        type: string;
    };
    bytes_counter: {
        type: string;
        time_series_metric: string;
    };
    bytes_normal_counter: {
        type: string;
    };
    bytes_gauge: {
        type: string;
        time_series_metric: string;
    };
    memory: {
        type: string;
    };
    extension: {
        type: string;
        fields: {
            keyword: {
                type: string;
                ignore_above: number;
            };
        };
    };
    event: {
        properties: {
            dataset: {
                type: string;
                time_series_dimension: boolean;
            };
        };
    };
};
