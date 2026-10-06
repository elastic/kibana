import type { SavedObjectTypeIdTuple } from '@kbn/core-saved-objects-common';
import type { SearchOperator } from './query_params';
export declare function getReferencesFilter({ references, operator, maxTermsPerClause, must, }: {
    references: SavedObjectTypeIdTuple[];
    operator?: SearchOperator;
    maxTermsPerClause?: number;
    must?: boolean;
}): {
    bool: {
        must: {
            nested: {
                path: string;
                query: {
                    bool: {
                        must: ({
                            term: {
                                'references.id': string;
                                'references.type'?: undefined;
                            };
                        } | {
                            term: {
                                'references.id'?: undefined;
                                'references.type': string;
                            };
                        })[];
                    };
                };
            };
        }[];
        should?: undefined;
        minimum_should_match?: undefined;
        must_not?: undefined;
    };
} | {
    bool: {
        must?: undefined;
        must_not: {
            bool: {
                must: {
                    nested: {
                        path: string;
                        query: {
                            bool: {
                                must: ({
                                    term: {
                                        'references.id': string;
                                        'references.type'?: undefined;
                                    };
                                } | {
                                    term: {
                                        'references.id'?: undefined;
                                        'references.type': string;
                                    };
                                })[];
                            };
                        };
                    };
                }[];
            };
        }[];
        should?: undefined;
        minimum_should_match?: undefined;
    };
} | {
    bool: {
        must?: undefined;
        should: {
            nested: {
                path: string;
                query: {
                    bool: {
                        must: ({
                            terms: {
                                'references.id': string[];
                            };
                            term?: undefined;
                        } | {
                            terms?: undefined;
                            term: {
                                'references.type': string;
                            };
                        })[];
                    };
                };
            };
        }[];
        minimum_should_match: number;
        must_not?: undefined;
    };
} | {
    bool: {
        must?: undefined;
        should?: undefined;
        minimum_should_match?: undefined;
        must_not: {
            nested: {
                path: string;
                query: {
                    bool: {
                        must: ({
                            terms: {
                                'references.id': string[];
                            };
                            term?: undefined;
                        } | {
                            terms?: undefined;
                            term: {
                                'references.type': string;
                            };
                        })[];
                    };
                };
            };
        }[];
    };
};
export declare const getNestedTermClauseForReference: (reference: SavedObjectTypeIdTuple) => {
    nested: {
        path: string;
        query: {
            bool: {
                must: ({
                    term: {
                        'references.id': string;
                        'references.type'?: undefined;
                    };
                } | {
                    term: {
                        'references.id'?: undefined;
                        'references.type': string;
                    };
                })[];
            };
        };
    };
};
