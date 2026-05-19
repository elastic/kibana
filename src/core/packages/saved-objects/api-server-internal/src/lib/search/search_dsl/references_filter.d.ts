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
                                'references.type': string;
                                'references.id'?: undefined;
                            };
                        })[];
                    };
                };
            };
        }[];
        must_not?: undefined;
        should?: undefined;
        minimum_should_match?: undefined;
    };
} | {
    bool: {
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
                                        'references.type': string;
                                        'references.id'?: undefined;
                                    };
                                })[];
                            };
                        };
                    };
                }[];
            };
        }[];
        must?: undefined;
        should?: undefined;
        minimum_should_match?: undefined;
    };
} | {
    bool: {
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
                            term: {
                                'references.type': string;
                            };
                            terms?: undefined;
                        })[];
                    };
                };
            };
        }[];
        minimum_should_match: number;
        must?: undefined;
        must_not?: undefined;
    };
} | {
    bool: {
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
                            term: {
                                'references.type': string;
                            };
                            terms?: undefined;
                        })[];
                    };
                };
            };
        }[];
        must?: undefined;
        should?: undefined;
        minimum_should_match?: undefined;
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
                        'references.type': string;
                        'references.id'?: undefined;
                    };
                })[];
            };
        };
    };
};
