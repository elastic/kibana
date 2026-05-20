export declare const regexpTemplate: {
    FIELD: string;
};
export declare const fuzzyTemplate: {
    FIELD: {};
};
export declare const prefixTemplate: {
    FIELD: {
        value: string;
    };
};
export declare const rangeTemplate: {
    FIELD: {
        gte: number;
        lte: number;
    };
};
export declare const spanFirstTemplate: {
    match: {
        span_term: {
            FIELD: string;
        };
    };
    end: number;
};
export declare const spanNearTemplate: {
    clauses: {
        span_term: {
            FIELD: {
                value: string;
            };
        };
    }[];
    slop: number;
    in_order: boolean;
};
export declare const spanTermTemplate: {
    FIELD: {
        value: string;
    };
};
export declare const spanNotTemplate: {
    include: {
        span_term: {
            FIELD: {
                value: string;
            };
        };
    };
    exclude: {
        span_term: {
            FIELD: {
                value: string;
            };
        };
    };
};
export declare const spanOrTemplate: {
    clauses: {
        span_term: {
            FIELD: {
                value: string;
            };
        };
    }[];
};
export declare const spanContainingTemplate: {
    little: {
        span_term: {
            FIELD: {
                value: string;
            };
        };
    };
    big: {
        span_near: {
            clauses: {
                span_term: {
                    FIELD: {
                        value: string;
                    };
                };
            }[];
            slop: number;
            in_order: boolean;
        };
    };
};
export declare const spanWithinTemplate: {
    little: {
        span_term: {
            FIELD: {
                value: string;
            };
        };
    };
    big: {
        span_near: {
            clauses: {
                span_term: {
                    FIELD: {
                        value: string;
                    };
                };
            }[];
            slop: number;
            in_order: boolean;
        };
    };
};
export declare const wildcardTemplate: {
    FIELD: {
        value: string;
    };
};
